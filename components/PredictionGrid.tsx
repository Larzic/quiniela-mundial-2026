"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, Match, Prediction } from "@/lib/types";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/types";

const PICKS: { value: "1" | "X" | "2"; label: string }[] = [
  { value: "1", label: "1" },
  { value: "X", label: "X" },
  { value: "2", label: "2" },
];

// Los pronósticos se cierran 1 hora antes del inicio del partido.
const LOCK_MS = 60 * 60 * 1000;

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

  // Agrupa por etapa, y dentro de "group" por letra de grupo
  const stages = useMemo(() => {
    const byStage: Record<string, Match[]> = {};
    for (const m of matches) (byStage[m.stage] ??= []).push(m);
    return Object.entries(byStage).sort(
      ([a], [b]) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99)
    );
  }, [matches]);

  function MatchRow({ m }: { m: Match }) {
    const home = teamById[m.home_team_id];
    const away = teamById[m.away_team_id];
    const kickoff = new Date(m.kickoff_at).getTime();
    const closesAt = kickoff - LOCK_MS;
    const locked = closesAt <= Date.now() || m.status === "finished";
    const current = picks[m.id];
    return (
      <div className="nx-card rounded-xl p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-white/40">
          <span>{m.label ?? (m.matchday ? `J${m.matchday}` : "")}</span>
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
        {!locked && (
          <div className="mb-2 text-center text-[11px] text-nxteal/80">
            Puedes cambiar tu pronóstico hasta{" "}
            {new Date(closesAt).toLocaleString("es-MX", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            (1 h antes)
          </div>
        )}
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
                      ? "border-nxpink bg-nx-grad text-white shadow-nx-glow"
                      : "border-white/15 bg-white/5 text-white/70 hover:border-nxpink",
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
          <div className="mt-2 text-center text-xs font-semibold text-nxteal">
            Final: {m.home_score} - {m.away_score}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {msg && (
        <p className="rounded-lg bg-nxred/15 px-3 py-2 text-sm text-nxred">
          {msg}
        </p>
      )}
      {stages.map(([stage, ms]) => {
        // dentro de grupos, subagrupar por letra
        if (stage === "group") {
          const byGroup: Record<string, Match[]> = {};
          for (const m of ms) (byGroup[m.group_letter ?? "?"] ??= []).push(m);
          const groups = Object.entries(byGroup).sort(([a], [b]) =>
            a.localeCompare(b)
          );
          return (
            <section key={stage}>
              <h2 className="mb-4 text-xl font-black text-nxpink">
                {STAGE_LABEL[stage]}
              </h2>
              <div className="space-y-6">
                {groups.map(([letter, gm]) => (
                  <div key={letter}>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-white/60">
                      Grupo {letter}
                    </h3>
                    <div className="space-y-2">
                      {gm.map((m) => (
                        <MatchRow key={m.id} m={m} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }
        return (
          <section key={stage}>
            <h2 className="mb-4 text-xl font-black text-nxpink">
              {STAGE_LABEL[stage] ?? stage}
            </h2>
            <div className="space-y-2">
              {ms.map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
