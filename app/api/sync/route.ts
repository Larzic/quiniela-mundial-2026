import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { ES_TO_EN, norm } from "@/lib/livescores";

export const dynamic = "force-dynamic";

// Trae los resultados FINALES de ESPN y los guarda en la BD (lo que reparte
// los puntos y actualiza la tabla de cada grupo). Idempotente: no toca partidos
// ya finalizados ni futuros.
export async function GET() {
  try {
    const espnRes = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
      { next: { revalidate: 20 } }
    );
    if (!espnRes.ok) return NextResponse.json({ updated: 0 });
    const espn = await espnRes.json();

    // Eventos ESPN -> mapa por par de nombres normalizados
    const evByPair: Record<
      string,
      { state: string; minute: number; teams: { name: string; score: number }[] }
    > = {};
    for (const e of espn.events ?? []) {
      const comp = e.competitions?.[0];
      const state = comp?.status?.type?.state ?? "pre";
      const clk = comp?.status?.displayClock ?? comp?.status?.type?.shortDetail ?? "";
      const minute = parseInt(String(clk).replace(/[^0-9].*$/, ""), 10) || 0;
      const teams = (comp?.competitors ?? []).map((c: any) => ({
        name: c.team?.name ?? c.team?.displayName ?? "",
        score: Number(c.score ?? 0),
      }));
      if (teams.length !== 2) continue;
      const key = teams
        .map((t: { name: string }) => norm(t.name))
        .sort()
        .join("|");
      evByPair[key] = { state, minute, teams };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const [{ data: matches }, { data: teams }] = await Promise.all([
      supabase
        .from("matches")
        .select("id, home_team_id, away_team_id, kickoff_at, status"),
      supabase.from("teams").select("id, name"),
    ]);

    const teamName: Record<number, string> = {};
    for (const t of teams ?? []) teamName[t.id] = t.name;

    const now = Date.now();
    let updated = 0;

    for (const m of matches ?? []) {
      if (m.status === "finished") continue;
      const homeEn =
        ES_TO_EN[teamName[m.home_team_id]] ?? teamName[m.home_team_id] ?? "";
      const awayEn =
        ES_TO_EN[teamName[m.away_team_id]] ?? teamName[m.away_team_id] ?? "";
      const key = [norm(homeEn), norm(awayEn)].sort().join("|");
      const ev = evByPair[key];
      if (!ev) continue;

      const kickoffMs = new Date(m.kickoff_at).getTime();
      // Final si ESPN lo marca terminado, o si está en vivo pero ya llegó al
      // minuto 90+ (tiempo cumplido), o si pasaron >2h del inicio.
      const over =
        ev.state === "post" ||
        (ev.state === "in" && ev.minute >= 90) ||
        (ev.state === "in" && now - kickoffMs > 2 * 60 * 60 * 1000);
      if (!over) continue;

      const hs =
        ev.teams.find((t) => norm(t.name) === norm(homeEn))?.score ?? 0;
      const as =
        ev.teams.find((t) => norm(t.name) === norm(awayEn))?.score ?? 0;

      const { error } = await supabase.rpc("apply_result", {
        p_match_id: m.id,
        p_home: hs,
        p_away: as,
      });
      if (!error) updated++;
    }

    return NextResponse.json({ updated });
  } catch (e) {
    return NextResponse.json({ updated: 0, error: String(e) });
  }
}
