"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, Match, Prediction } from "@/lib/types";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/types";
import {
  buildLiveMap,
  liveForMatch,
  type LiveEvent,
  type LiveInfo,
} from "@/lib/livescores";

// Los pronósticos se cierran al iniciar el partido (0 = sin margen previo).
const LOCK_MS = 0;

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

// ---- Tabla de posiciones de un grupo (con resultados reales) ----
type StandRow = {
  team: Team;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
};

function computeStandings(groupTeams: Team[], groupMatches: Match[]): StandRow[] {
  const map = new Map<number, StandRow>();
  for (const t of groupTeams)
    map.set(t.id, { team: t, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 });
  for (const m of groupMatches) {
    if (m.status !== "finished" || m.home_score == null || m.away_score == null)
      continue;
    const h = map.get(m.home_team_id);
    const a = map.get(m.away_team_id);
    if (!h || !a) continue;
    h.pj++;
    a.pj++;
    h.gf += m.home_score;
    h.gc += m.away_score;
    a.gf += m.away_score;
    a.gc += m.home_score;
    if (m.home_score > m.away_score) {
      h.g++;
      h.pts += 3;
      a.p++;
    } else if (m.home_score < m.away_score) {
      a.g++;
      a.pts += 3;
      h.p++;
    } else {
      h.e++;
      a.e++;
      h.pts++;
      a.pts++;
    }
  }
  return [...map.values()].sort(
    (x, y) =>
      y.pts - x.pts ||
      y.gf - y.gc - (x.gf - x.gc) ||
      y.gf - x.gf ||
      x.team.name.localeCompare(y.team.name)
  );
}

function GroupStandings({
  teams,
  matches,
}: {
  teams: Team[];
  matches: Match[];
}) {
  const rows = computeStandings(teams, matches);
  return (
    <div className="nx-card mb-3 overflow-hidden rounded-xl">
      <table className="w-full text-xs">
        <thead className="bg-white/5 text-white/50">
          <tr>
            <th className="px-2 py-1.5 text-left">#</th>
            <th className="px-2 py-1.5 text-left">Equipo</th>
            <th className="px-2 py-1.5 text-center">PJ</th>
            <th className="px-2 py-1.5 text-center">Dif</th>
            <th className="px-2 py-1.5 text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const dif = r.gf - r.gc;
            return (
              <tr
                key={r.team.id}
                className={`border-t border-white/5 ${
                  i < 2 ? "bg-nxteal/5" : ""
                }`}
              >
                <td className="px-2 py-1.5 text-white/40">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium">
                  {r.team.flag} {r.team.name}
                </td>
                <td className="px-2 py-1.5 text-center text-white/60">{r.pj}</td>
                <td className="px-2 py-1.5 text-center text-white/60">
                  {dif > 0 ? "+" : ""}
                  {dif}
                </td>
                <td className="px-2 py-1.5 text-center font-black text-nxteal">
                  {r.pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="bg-white/5 px-2 py-1 text-center text-[10px] text-white/40">
        Los 2 primeros (resaltados) avanzan · se actualiza con los resultados
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? "bg-nx-grad text-white shadow-nx-glow"
          : "border border-white/15 bg-white/5 text-white/70 hover:border-nxpink"
      }`}
    >
      {children}
    </button>
  );
}

// ---- Fila de un partido (componente estable) ----
function MatchRow({
  m,
  home,
  away,
  now,
  cur,
  sv,
  saving,
  live,
  onGoal,
  onSave,
}: {
  m: Match;
  home?: Team;
  away?: Team;
  now: number;
  cur: ScoreState;
  sv?: ScoreState;
  saving: number | null;
  live?: LiveInfo | null;
  onGoal: (matchId: number, side: "h" | "a", value: string) => void;
  onSave: (matchId: number) => void;
}) {
  const kickoff = new Date(m.kickoff_at).getTime();
  const closesAt = kickoff - LOCK_MS;
  const remaining = closesAt - now;
  const locked = remaining <= 0 || m.status === "finished";
  const urgent = !locked && remaining <= 60 * 60 * 1000;

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

      {live && (live.state === "in" || live.state === "post") && (
        <div
          className={`mb-2 rounded-lg px-2 py-1 text-center text-sm font-bold ${
            live.state === "in"
              ? "animate-pulse bg-nxred/25 text-nxred"
              : "bg-white/5 text-white/70"
          }`}
        >
          {live.state === "in" ? "🔴 EN VIVO" : "ESPN"} · {home?.flag}{" "}
          {live.homeScore} - {live.awayScore} {away?.flag}
          <span className="font-normal opacity-80">
            {" "}
            · {live.state === "in" ? live.clock || live.detail : live.detail}
          </span>
        </div>
      )}

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
          onChange={(e) => onGoal(m.id, "h", e.target.value)}
          className={goalInput}
        />
        <span className="text-white/30">-</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="-"
          value={cur.a}
          disabled={locked || saving === m.id}
          onChange={(e) => onGoal(m.id, "a", e.target.value)}
          className={goalInput}
        />
        <span className="flex-1 text-left text-sm font-semibold">
          {away?.name} {away?.flag}
        </span>
      </div>

      {!locked && (
        <div className="mt-2 flex items-center justify-center">
          <button
            onClick={() => onSave(m.id)}
            disabled={!complete || !dirty || saving === m.id}
            className="rounded-lg bg-nx-grad px-5 py-1.5 text-sm font-semibold text-white shadow-nx-glow transition hover:opacity-90 disabled:opacity-40"
          >
            {saving === m.id
              ? "Guardando…"
              : dirty
                ? "Guardar pronóstico"
                : "Guardado ✓"}
          </button>
        </div>
      )}

      {resumen && (
        <div className="mt-2 text-center text-xs text-nxteal">
          ✅ Tu pronóstico: <b>{resumen}</b>
        </div>
      )}

      {m.status === "finished" && live?.state !== "in" && (
        <div className="mt-2 text-center text-xs font-semibold text-white/70">
          Resultado final: {m.home_score} - {m.away_score}
        </div>
      )}
    </div>
  );
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
  const teamsByGroup = useMemo(() => {
    const map: Record<string, Team[]> = {};
    for (const t of teams) (map[t.group_letter ?? "?"] ??= []).push(t);
    return map;
  }, [teams]);
  const groupLetters = useMemo(
    () =>
      [...new Set(teams.map((t) => t.group_letter).filter(Boolean))].sort() as string[],
    [teams]
  );

  const initial = useMemo(
    () =>
      Object.fromEntries(
        predictions
          .filter((p) => p.home_goals !== null && p.away_goals !== null)
          .map((p) => [
            p.match_id,
            { h: String(p.home_goals), a: String(p.away_goals) },
          ])
      ) as Record<number, ScoreState>,
    [predictions]
  );

  const [scores, setScores] = useState<Record<number, ScoreState>>(initial);
  const [saved, setSaved] = useState<Record<number, ScoreState>>(initial);
  const [saving, setSaving] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const [now, setNow] = useState(() => Date.now());
  const [tz, setTz] = useState("");
  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Marcadores en vivo (ESPN), sondea cada 30s.
  const [liveMap, setLiveMap] = useState<Record<string, LiveEvent>>({});
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await fetch("/api/live");
        const d = await r.json();
        if (active) setLiveMap(buildLiveMap(d.events ?? []));
      } catch {}
    }
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
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
    const c = scores[matchId];
    if (!c || c.h === "" || c.a === "") {
      setMsg("Escribe los goles de ambos equipos antes de guardar.");
      return;
    }
    const h = Number(c.h);
    const a = Number(c.a);
    setSaving(matchId);
    setMsg(null);

    let { error } = await upsertScore(matchId, h, a);
    if (error) {
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
    setSaved((s) => ({ ...s, [matchId]: { h: c.h, a: c.a } }));
  }

  const stages = useMemo(() => {
    const byStage: Record<string, Match[]> = {};
    for (const m of matches) (byStage[m.stage] ??= []).push(m);
    return Object.entries(byStage).sort(
      ([a], [b]) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99)
    );
  }, [matches]);

  const koStages = useMemo(
    () => stages.map(([s]) => s).filter((s) => s !== "group"),
    [stages]
  );

  function renderRow(m: Match) {
    return (
      <MatchRow
        key={m.id}
        m={m}
        home={teamById[m.home_team_id]}
        away={teamById[m.away_team_id]}
        now={now}
        cur={scores[m.id] ?? { h: "", a: "" }}
        sv={saved[m.id]}
        saving={saving}
        live={liveForMatch(
          liveMap,
          teamById[m.home_team_id]?.name ?? "",
          teamById[m.away_team_id]?.name ?? ""
        )}
        onGoal={setGoal}
        onSave={save}
      />
    );
  }

  return (
    <div className="space-y-8">
      {tz && (
        <p className="text-center text-xs text-white/40">
          🕒 Horarios y contador en tu hora local ({tz})
        </p>
      )}

      {/* Filtro por grupo / fase */}
      <div className="sticky top-14 z-10 -mx-4 flex gap-1.5 overflow-x-auto border-b border-white/10 bg-nxink/85 px-4 py-2 backdrop-blur">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Todos
        </FilterChip>
        {groupLetters.map((L) => (
          <FilterChip
            key={L}
            active={filter === `g:${L}`}
            onClick={() => setFilter(`g:${L}`)}
          >
            Grupo {L}
          </FilterChip>
        ))}
        {koStages.map((s) => (
          <FilterChip
            key={s}
            active={filter === `s:${s}`}
            onClick={() => setFilter(`s:${s}`)}
          >
            {STAGE_LABEL[s] ?? s}
          </FilterChip>
        ))}
      </div>

      {filter !== "all" && (
        <p className="text-center text-xs text-white/50">
          Mostrando solo{" "}
          <b className="text-nxteal">
            {filter.startsWith("g:")
              ? `Grupo ${filter.slice(2)}`
              : (STAGE_LABEL[filter.slice(2)] ?? filter.slice(2))}
          </b>{" "}
          · toca <b className="text-white">Todos</b> para ver todo
        </p>
      )}

      {msg && (
        <p className="rounded-lg bg-nxred/15 px-3 py-2 text-sm text-nxred">
          {msg}
        </p>
      )}

      {stages.map(([stage, ms]) => {
        if (stage === "group") {
          if (filter.startsWith("s:")) return null;
          const byGroup: Record<string, Match[]> = {};
          for (const m of ms) (byGroup[m.group_letter ?? "?"] ??= []).push(m);
          let groups = Object.entries(byGroup).sort(([a], [b]) =>
            a.localeCompare(b)
          );
          if (filter.startsWith("g:"))
            groups = groups.filter(([L]) => L === filter.slice(2));
          if (groups.length === 0) return null;
          return (
            <section key={stage}>
              {filter === "all" && (
                <h2 className="mb-4 text-xl font-black text-nxpink">
                  {STAGE_LABEL[stage]}
                </h2>
              )}
              <div className="space-y-8">
                {groups.map(([letter, gm]) => (
                  <div key={letter}>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-white/60">
                      Grupo {letter}
                    </h3>
                    <GroupStandings
                      teams={teamsByGroup[letter] ?? []}
                      matches={gm}
                    />
                    <div className="space-y-2">{gm.map(renderRow)}</div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // Fases eliminatorias
        if (filter.startsWith("g:")) return null;
        if (filter.startsWith("s:") && filter.slice(2) !== stage) return null;
        return (
          <section key={stage}>
            <h2 className="mb-4 text-xl font-black text-nxpink">
              {STAGE_LABEL[stage] ?? stage}
            </h2>
            <div className="space-y-2">{ms.map(renderRow)}</div>
          </section>
        );
      })}
    </div>
  );
}
