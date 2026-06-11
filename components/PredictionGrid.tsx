"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, Match, Prediction } from "@/lib/types";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/types";

// Los pronósticos se cierran al iniciar el partido (0 = sin margen previo).
const LOCK_MS = 0;

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

function pickFromScore(h: number, a: number): "1" | "X" | "2" {
  if (h > a) return "1";
  if (h === a) return "X";
  return "2";
}

type ScoreState = { h: string; a: string };

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

  // Marcadores pronosticados por partido
  const [scores, setScores] = useState<Record<number, ScoreState>>(() =>
    Object.fromEntries(
      predictions
        .filter((p) => p.home_goals !== null && p.away_goals !== null)
        .map((p) => [
          p.match_id,
          { h: String(p.home_goals), a: String(p.away_goals) },
        ])
    )
  );
  // Marcador ya guardado (confirmado en BD) por partido
  const [saved, setSaved] = useState<Record<number, ScoreState>>(() =>
    Object.fromEntries(
      predictions
        .filter((p) => p.home_goals !== null && p.away_goals !== null)
        .map((p) => [
          p.match_id,
          { h: String(p.home_goals), a: String(p.away_goals) },
        ])
    )
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

  function setGoal(matchId: number, side: "h" | "a", value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 2);
    setScores((s) => {
      const prev = s[matchId] ?? { h: "", a: "" };
      return { ...s, [matchId]: { ...prev, [side]: clean } };
    });
  }

  async function upsertScore(matchId: number, h: number, a: number) {
    return supabase.from("predictions").upsert(
      {
        user_id: userId,
        match_id: matchId,
        home_goals: h,
        away_goals: a,
        pick: pickFromScore(h, a),
      },
      { onConflict: "user_id,match_id" }
    );
  }

  async function save(matchId: number) {
    const cur = scores[matchId];
    if (!cur || cur.h === "" || cur.a === "") {
      setMsg("Escribe los goles de ambos equipos antes de guardar.");
      return;
    }
    const h = Number(cur.h);
    const a = Number(cur.a);
    setSaving(matchId);
    setMsg(null);

    let { error } = await upsertScore(matchId, h, a);
    if (error) {
      // token expirado tras dejar la pestaña abierta: refresca y reintenta
      await supabase.auth.refreshSession();
      ({ error } = await upsertScore(matchId, h, a));
    }
    setSaving(null);
    if (error) {
      setMsg(
        "No se pudo guardar tu pronóstico. Recarga la página e inténtalo de nuevo. (" +
          error.message +
          ")"
      );
      return;
    }
    setSaved((s) => ({ ...s, [matchId]: { h: cur.h, a: cur.a } }));
  }

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
    const urgent = !locked && remaining <= 60 * 60 * 1000;

    const cur = scores[m.id] ?? { h: "", a: "" };
    const sv = saved[m.id];
    const complete = cur.h !== "" && cur.a !== "";
    const dirty = !sv || sv.h !== cur.h || sv.a !== cur.a;

    let resumen: string | null = null;
    if (sv) {
      const h = Number(sv.h);
      const a = Number(sv.a);
      const p = pickFromScore(h, a);
      resumen =
        p === "X"
          ? `Empate ${h}-${a}`
          : p === "1"
            ? `Gana ${home?.name} ${h}-${a}`
            : `Gana ${away?.name} ${a}-${h}`;
    }

    const goalInput =
      "w-12 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-center text-lg font-bold text-white outline-none focus:border-nxpink disabled:opacity-50";

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
            <span className="text-white/40">· al iniciar el partido</span>
          </div>
        )}

        {/* Marcador: goles de cada equipo */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <span className="flex-1 text-right text-sm font-semibold">
            {home?.flag} {home?.name}
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="-"
            value={cur.h}
            disabled={locked || saving === m.id}
            onChange={(e) => setGoal(m.id, "h", e.target.value)}
            className={goalInput}
          />
          <span className="text-white/30">-</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="-"
            value={cur.a}
            disabled={locked || saving === m.id}
            onChange={(e) => setGoal(m.id, "a", e.target.value)}
            className={goalInput}
          />
          <span className="flex-1 text-left text-sm font-semibold">
            {away?.name} {away?.flag}
          </span>
        </div>

        {!locked && (
          <div className="mt-2 flex items-center justify-center">
            <button
              onClick={() => save(m.id)}
              disabled={!complete || !dirty || saving === m.id}
              className="rounded-lg bg-nx-grad px-5 py-1.5 text-sm font-semibold text-white shadow-nx-glow transition hover:opacity-90 disabled:opacity-40"
            >
              {saving === m.id ? "Guardando…" : dirty ? "Guardar pronóstico" : "Guardado ✓"}
            </button>
          </div>
        )}

        {resumen && (
          <div className="mt-2 text-center text-xs text-nxteal">
            ✅ Tu pronóstico: <b>{resumen}</b>
          </div>
        )}

        {m.status === "finished" && (
          <div className="mt-2 text-center text-xs font-semibold text-white/70">
            Resultado final: {m.home_score} - {m.away_score}
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
