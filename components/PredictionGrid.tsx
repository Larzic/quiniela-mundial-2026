"use client";

import { useEffect, useMemo, useState } from "react";
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

// Formatea un tiempo restante (ms) como "2d 3h" / "3h 12m" / "12m 05s" / "45s".
function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

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

  // Reloj en vivo (para el contador) y zona horaria local del visitante.
  const [now, setNow] = useState(() => Date.now());
  const [tz, setTz] = useState("");
  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function upsertPick(matchId: number, pick: "1" | "X" | "2") {
    return supabase
      .from("predictions")
      .upsert(
        { user_id: userId, match_id: matchId, pick },
        { onConflict: "user_id,match_id" }
      );
  }

  async function choose(matchId: number, pick: "1" | "X" | "2") {
    const prev = picks[matchId];
    setPicks((p) => ({ ...p, [matchId]: pick }));
    setSaving(matchId);
    setMsg(null);

    let { error } = await upsertPick(matchId, pick);

    // Si falla (p. ej. sesión/token expirado tras dejar la pestaña abierta),
    // refresca la sesión y reintenta una vez.
    if (error) {
      await supabase.auth.refreshSession();
      ({ error } = await upsertPick(matchId, pick));
    }

    setSaving(null);
    if (error) {
      setPicks((p) => ({ ...p, [matchId]: prev }));
      setMsg(
        "No se pudo guardar tu pronóstico. Recarga la página e inténtalo de nuevo. (" +
          error.message +
          ")"
      );
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
    const remaining = closesAt - now;
    const locked = remaining <= 0 || m.status === "finished";
    const urgent = !locked && remaining <= 60 * 60 * 1000; // última hora
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
              timeZoneName: "short",
            })}
          </span>
        </div>
        {locked ? (
          <div className="mb-2 text-center text-[11px] font-semibold text-white/50">
            🔒 Apuestas cerradas
          </div>
        ) : (
          <div
            className={`mb-2 flex items-center justify-center gap-1 text-[11px] ${
              urgent ? "text-nxred" : "text-nxteal/90"
            }`}
          >
            <span>⏳</span>
            <span className="font-semibold tabular-nums">
              Cierra en {formatRemaining(remaining)}
            </span>
            <span className="text-white/40">· 1 h antes del partido</span>
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
      {tz && (
        <p className="text-center text-xs text-white/40">
          🕒 Horarios y contador en tu hora local ({tz})
        </p>
      )}
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
