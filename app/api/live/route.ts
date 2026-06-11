import { NextResponse } from "next/server";
import type { LiveEvent } from "@/lib/livescores";

export const dynamic = "force-dynamic";

// Consulta el feed público de ESPN (Mundial 2026) y devuelve los partidos
// del día con estado y marcador. Se cachea ~20s para no saturar la fuente.
export async function GET() {
  try {
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
      { next: { revalidate: 20 } }
    );
    if (!res.ok) return NextResponse.json({ events: [] });
    const data = await res.json();

    const events: LiveEvent[] = (data.events ?? []).map((e: any) => {
      const comp = e.competitions?.[0];
      const st = comp?.status?.type ?? e.status?.type ?? {};
      const state: LiveEvent["state"] =
        st.state === "in" ? "in" : st.state === "post" ? "post" : "pre";
      const teams = (comp?.competitors ?? []).map((c: any) => ({
        name: c.team?.name ?? c.team?.displayName ?? "",
        score: Number(c.score ?? 0),
        homeAway: c.homeAway ?? "",
      }));
      return {
        state,
        detail: st.shortDetail ?? st.description ?? "",
        clock: comp?.status?.displayClock ?? "",
        teams,
      };
    });

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
