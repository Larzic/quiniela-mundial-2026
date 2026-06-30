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

      // 2) Resultado FINAL (solo cuando ESPN marca el partido terminado, o
      // como red de seguridad si pasaron >3h del inicio). apply_result corrige
      // el marcador si cambió (goles posteriores al minuto 90).
      const kickoffMs2 = new Date(m.kickoff_at).getTime();
      const finalized =
        ev.state === "post" || Date.now() - kickoffMs2 > 3 * 60 * 60 * 1000;
      if (!finalized) continue;
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

    // ----------------------------------------------------------------
    // ELIMINATORIAS: cuando ESPN ya definió el cruce (equipos reales),
    // asignamos los equipos a nuestro partido KO (emparejando por hora de
    // inicio) y, si ya terminó, cargamos el resultado. Mientras ESPN siga
    // mostrando cupos ("Group A 2nd Place", isActive=false) no se toca nada,
    // así el partido se queda como "Próximamente".
    let koUpdated = 0;
    try {
      const koRes = await fetch(`${ESPN}?dates=20260628-20260720`, {
        next: { revalidate: 60 },
      });
      if (koRes.ok) {
        const koData = await koRes.json();
        const espnByKo: Record<number, any> = {};
        for (const e of koData.events ?? []) {
          const comp = e.competitions?.[0];
          if (!comp) continue;
          const slug: string = e.season?.slug ?? "";
          if (!slug || slug.includes("group")) continue;
          const dt = comp.startDate ?? e.date ?? "";
          const ms = new Date(dt).getTime();
          if (Number.isNaN(ms)) continue;
          espnByKo[Math.floor(ms / 60000)] = comp;
        }

        // id de cada selección por su nombre en inglés normalizado
        const idByEn: Record<string, number> = {};
        for (const t of teams ?? [])
          idByEn[norm(toEnglish(t.name))] = t.id;

        const { data: koMatches } = await supabase
          .from("matches")
          .select("id, kickoff_at, home_team_id, away_team_id, status")
          .neq("stage", "group");

        for (const m of koMatches ?? []) {
          const koMin = Math.floor(new Date(m.kickoff_at).getTime() / 60000);
          const comp = espnByKo[koMin];
          if (!comp) continue;
          const cs = comp.competitors ?? [];
          const hc = cs.find((c: any) => c.homeAway === "home") ?? cs[0];
          const ac = cs.find((c: any) => c.homeAway === "away") ?? cs[1];
          if (!hc || !ac) continue;
          const state = comp.status?.type?.state ?? "pre";

          // 1) Asignar equipos reales si ESPN ya los definió (isActive=true)
          if (
            (m.home_team_id == null || m.away_team_id == null) &&
            hc.team?.isActive &&
            ac.team?.isActive
          ) {
            const hid =
              idByEn[norm(hc.team.name ?? hc.team.displayName ?? "")];
            const aid =
              idByEn[norm(ac.team.name ?? ac.team.displayName ?? "")];
            if (hid && aid) {
              const { error } = await supabase.rpc("set_teams", {
                p_match_id: m.id,
                p_home: hid,
                p_away: aid,
              });
              if (!error) {
                koUpdated++;
                m.home_team_id = hid;
                m.away_team_id = aid;
              }
            }
          }

          // 2) Resultado final (ya con equipos asignados)
          if (
            m.home_team_id != null &&
            m.away_team_id != null &&
            state === "post"
          ) {
            const hs = Number(hc.score ?? 0);
            const as = Number(ac.score ?? 0);
            const { error } = await supabase.rpc("apply_result", {
              p_match_id: m.id,
              p_home: hs,
              p_away: as,
            });
            if (!error) koUpdated++;
          }
        }
      }
    } catch {
      // ignorar fallos del bloque de eliminatorias (no romper el sync)
    }

    // ----------------------------------------------------------------
    // RESPALDO: OpenFootball (dominio público, sin API key). Si ESPN no
    // trajo el resultado de un partido que ya tiene equipos, lo tomamos de
    // aquí como segunda fuente. ESPN es la fuente primaria (corre antes);
    // esto solo rellena lo que quedó sin finalizar.
    let ofUpdated = 0;
    try {
      const ofRes = await fetch(
        "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
        { next: { revalidate: 300 } }
      );
      if (ofRes.ok) {
        const ofData = await ofRes.json();
        // Nombres que OpenFootball escribe distinto a ESPN
        const OF_ALIAS: Record<string, string> = {
          "Czech Republic": "Czechia",
          USA: "United States",
        };
        const ofName = (n: string) => OF_ALIAS[n] ?? n;
        const ofByPair: Record<string, { a: string; sa: number; sb: number }> =
          {};
        for (const mm of ofData.matches ?? []) {
          const ft = mm?.score?.ft;
          if (!Array.isArray(ft) || ft.length !== 2) continue;
          const t1 = ofName(mm.team1 ?? "");
          const t2 = ofName(mm.team2 ?? "");
          if (!t1 || !t2) continue;
          const key = [norm(t1), norm(t2)].sort().join("|");
          ofByPair[key] = { a: norm(t1), sa: Number(ft[0]), sb: Number(ft[1]) };
        }

        const { data: pend } = await supabase
          .from("matches")
          .select("id, home_team_id, away_team_id")
          .neq("status", "finished");

        for (const m of pend ?? []) {
          if (m.home_team_id == null || m.away_team_id == null) continue;
          const he = norm(toEnglish(teamName[m.home_team_id] ?? ""));
          const ae = norm(toEnglish(teamName[m.away_team_id] ?? ""));
          const of = ofByPair[[he, ae].sort().join("|")];
          if (!of) continue;
          const hs = of.a === he ? of.sa : of.sb;
          const as = of.a === he ? of.sb : of.sa;
          const { error } = await supabase.rpc("apply_result", {
            p_match_id: m.id,
            p_home: hs,
            p_away: as,
          });
          if (!error) ofUpdated++;
        }
      }
    } catch {
      // si OpenFootball falla, seguimos solo con ESPN
    }

    return NextResponse.json({
      updated: updated + koUpdated + ofUpdated,
      timesSynced,
      source2: ofUpdated,
    });
  } catch (e) {
    return NextResponse.json({ updated: 0, error: String(e) });
  }
}
