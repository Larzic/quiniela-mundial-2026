import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { toEnglish, norm } from "@/lib/livescores";

export const dynamic = "force-dynamic";

const ESPN =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// Sincroniza desde el scoreboard de ESPN (partidos del día, con su fecha real
// y estado en vivo): (1) horario real de cada partido y (2) resultados finales
// (que reparten puntos y actualizan la tabla del grupo). Idempotente.
export async function GET() {
  try {
    const res = await fetch(ESPN, { next: { revalidate: 20 } });
    if (!res.ok) return NextResponse.json({ updated: 0, timesSynced: 0 });
    const data = await res.json();

    const evByPair: Record<
      string,
      {
        state: string;
        minute: number;
        date: string;
        teams: { name: string; score: number }[];
      }
    > = {};
    for (const e of data.events ?? []) {
      const comp = e.competitions?.[0];
      if (!comp) continue;
      const state = comp.status?.type?.state ?? "pre";
      const clk = comp.status?.displayClock ?? "";
      const minute = parseInt(String(clk).replace(/[^0-9].*$/, ""), 10) || 0;
      const date = comp.startDate ?? e.date ?? "";
      const teams = (comp.competitors ?? []).map((c: any) => ({
        name: c.team?.name ?? c.team?.displayName ?? "",
        score: Number(c.score ?? 0),
      }));
      if (teams.length !== 2) continue;
      const key = teams
        .map((t: { name: string }) => norm(t.name))
        .sort()
        .join("|");
      evByPair[key] = { state, minute, date, teams };
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

    let updated = 0;
    let timesSynced = 0;

    for (const m of matches ?? []) {
      const homeEn = toEnglish(teamName[m.home_team_id] ?? "");
      const awayEn = toEnglish(teamName[m.away_team_id] ?? "");
      const key = [norm(homeEn), norm(awayEn)].sort().join("|");
      const ev = evByPair[key];
      if (!ev) continue;

      // 1) Horario real (si no está finalizado)
      if (m.status !== "finished" && ev.date) {
        const espnMs = new Date(ev.date).getTime();
        if (
          !Number.isNaN(espnMs) &&
          espnMs !== new Date(m.kickoff_at).getTime()
        ) {
          const { error } = await supabase.rpc("set_kickoff", {
            p_match_id: m.id,
            p_kickoff: new Date(espnMs).toISOString(),
          });
          if (!error) timesSynced++;
        }
      }

      // 2) Resultado final
      if (m.status === "finished") continue;
      const over = ev.state === "post" || (ev.state === "in" && ev.minute >= 90);
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

    return NextResponse.json({ updated, timesSynced });
  } catch (e) {
    return NextResponse.json({ updated: 0, error: String(e) });
  }
}
