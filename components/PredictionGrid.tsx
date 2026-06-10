"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, Match, Prediction } from "@/lib/types";

const PICKS: { value: "1" | "X" | "2"; label: string }[] = [
  { value: "1", label: "1" },
  { value: "X", label: "X" },
  { value: "2", label: "2" },
];

export default function PredictionGrid({
  teams,
  matches,
  predictions,
  userId,
}: {
  teams: Team[];
  matches: Match[];
  predictions: Prediction[];
  userId: string;
}) {
  const supabase = createClient();
  const teamById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );
  const [picks, setPicks] = useState<Record<number, "1" | "X" | "2">>(
    Object.fromEntries(predictions.map((p) => [p.match_id, p.pick]))
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function choose(matchId: number, pick: "1" | "X" | "2") {
    const prev = picks[matchId];
    setPicks((p) => ({ ...p, [matchId]: pick }));
    setSaving(matchId);
    setMsg(null);
    const { error } = await supabase
      .from("predictions")
      .upsert(
        { user_id: userId, match_id: matchId, pick },
        { onConflict: "user_id,match_id" }
      );
    setSaving(null);
    if (error) {
      setPicks((p) => ({ ...p, [matchId]: prev }));
      setMsg(error.message);
    }
  }

  // Agrupa por grupo
  const groups = useMemo(() => {
    const g: Record<string, Match[]> = {};
    for (const m of matches) (g[m.group_letter] ??= []).push(m);
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  return (
    <div className="space-y-8">
      {msg && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {msg}
        </p>
      )}
      {groups.map(([letter, ms]) => (
        <section key={letter}>
          <h2 className="mb-3 text-lg font-bold text-pitchDark">
            Grupo {letter}
          </h2>
          <div className="space-y-2">
            {ms.map((m) => {
              const home = teamById[m.home_team_id];
              const away = teamById[m.away_team_id];
              const locked =
                new Date(m.kickoff_at).getTime() <= Date.now() ||
                m.status === "finished";
              const current = picks[m.id];
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>J{m.matchday}</span>
                    <span>
                      {new Date(m.kickoff_at).toLocaleString("es-MX", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {locked ? " · 🔒 cerrado" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-right text-sm font-medium">
                      {home?.flag} {home?.name}
                    </div>
                    <div className="flex gap-1">
                      {PICKS.map((p) => {
                        const active = current === p.value;
                        return (
                          <button
                            key={p.value}
                            disabled={locked || saving === m.id}
                            onClick={() => choose(m.id, p.value)}
                            className={[
                              "h-9 w-9 rounded-lg border text-sm font-bold transition",
                              active
                                ? "border-pitch bg-pitch text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:border-pitch",
                              locked ? "cursor-not-allowed opacity-50" : "",
                            ].join(" ")}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex-1 text-left text-sm font-medium">
                      {away?.name} {away?.flag}
                    </div>
                  </div>
                  {m.status === "finished" && (
                    <div className="mt-2 text-center text-xs font-semibold text-slate-500">
                      Final: {m.home_score} - {m.away_score}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
