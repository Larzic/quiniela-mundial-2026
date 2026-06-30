"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Team, Match } from "@/lib/types";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/types";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

const STAGES = ["r32", "r16", "qf", "sf", "third", "final"];

export default function AdminResults({
  teams,
  matches,
}: {
  teams: Team[];
  matches: Match[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const teamById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const [rows, setRows] = useState(
    matches.map((m) => ({
      ...m,
      hs: m.home_score ?? "",
      as: m.away_score ?? "",
      ko: toLocalInput(m.kickoff_at),
    }))
  );
  const [savingId, setSavingId] = useState<number | null>(null);
  const [okId, setOkId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Nuevo partido de eliminatoria ---
  const [nStage, setNStage] = useState("r16");
  const [nHome, setNHome] = useState("");
  const [nAway, setNAway] = useState("");
  const [nKo, setNKo] = useState("");
  const [nLabel, setNLabel] = useState("");
  const [creating, setCreating] = useState(false);

  function set(id: number, field: string, value: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function saveResult(id: number) {
    const r = rows.find((x) => x.id === id)!;
    setSavingId(id);
    setOkId(null);
    setError(null);
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: r.hs === "" ? null : Number(r.hs),
        away_score: r.as === "" ? null : Number(r.as),
        status: r.hs !== "" && r.as !== "" ? "finished" : "scheduled",
      })
      .eq("id", id);
    setSavingId(null);
    if (error) setError(error.message);
    else setOkId(id);
  }

  async function saveKickoff(id: number) {
    const r = rows.find((x) => x.id === id)!;
    setSavingId(id);
    setError(null);
    const { error } = await supabase
      .from("matches")
      .update({ kickoff_at: new Date(r.ko).toISOString() })
      .eq("id", id);
    setSavingId(null);
    if (error) setError(error.message);
    else setOkId(id);
  }

  async function createMatch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nHome || !nAway || nHome === nAway || !nKo) {
      setError("Elige dos equipos distintos y la fecha/hora.");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("matches").insert({
      stage: nStage,
      home_team_id: Number(nHome),
      away_team_id: Number(nAway),
      kickoff_at: new Date(nKo).toISOString(),
      label: nLabel || STAGE_LABEL[nStage],
    });
    setCreating(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNHome("");
    setNAway("");
    setNKo("");
    setNLabel("");
    router.refresh();
  }

  const sorted = [...rows].sort(
    (a, b) =>
      (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99) ||
      a.kickoff_at.localeCompare(b.kickoff_at)
  );

  const input =
    "rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-white outline-none focus:border-nxpink";

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg bg-nxred/15 px-3 py-2 text-sm text-nxred">
          {error}
        </p>
      )}

      {/* Crear partido de eliminatoria */}
      <form onSubmit={createMatch} className="nx-card rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-nxpink">
          ➕ Agregar partido de eliminatoria
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <select
            value={nStage}
            onChange={(e) => setNStage(e.target.value)}
            className={input}
          >
            {STAGES.map((s) => (
              <option key={s} value={s} className="bg-nxpanel">
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={nHome}
            onChange={(e) => setNHome(e.target.value)}
            className={input}
          >
            <option value="" className="bg-nxpanel">
              Equipo local
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-nxpanel">
                {t.flag} {t.name}
              </option>
            ))}
          </select>
          <select
            value={nAway}
            onChange={(e) => setNAway(e.target.value)}
            className={input}
          >
            <option value="" className="bg-nxpanel">
              Equipo visitante
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-nxpanel">
                {t.flag} {t.name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={nKo}
            onChange={(e) => setNKo(e.target.value)}
            className={input}
          />
          <input
            value={nLabel}
            onChange={(e) => setNLabel(e.target.value)}
            placeholder="Etiqueta (opcional)"
            className={`${input} placeholder-white/30`}
          />
          <button
            disabled={creating}
            className="rounded-lg bg-nx-grad px-3 py-1.5 font-semibold text-white shadow-nx-glow disabled:opacity-60"
          >
            {creating ? "Creando…" : "Crear partido"}
          </button>
        </div>
      </form>

      {/* Resultados */}
      <div className="space-y-2">
        {sorted.map((m) => {
          const home = m.home_team_id != null ? teamById[m.home_team_id] : undefined;
          const away = m.away_team_id != null ? teamById[m.away_team_id] : undefined;
          const homeName = home?.name ?? m.home_label ?? "Por definir";
          const awayName = away?.name ?? m.away_label ?? "Por definir";
          return (
            <div key={m.id} className="nx-card rounded-xl p-3 text-sm">
              <div className="mb-2 flex items-center justify-between text-xs text-white/40">
                <span>
                  {STAGE_LABEL[m.stage] ?? m.stage}
                  {m.group_letter ? ` · Grupo ${m.group_letter}` : ""}
                  {m.matchday ? ` · J${m.matchday}` : ""}
                  {m.label && m.stage !== "group" ? ` · ${m.label}` : ""}
                </span>
                {okId === m.id && (
                  <span className="font-semibold text-nxteal">Guardado ✓</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-[8rem] flex-1 text-right font-medium">
                  {home?.flag} {homeName}
                </span>
                <input
                  type="number"
                  min={0}
                  value={m.hs}
                  onChange={(e) => set(m.id, "hs", e.target.value)}
                  className={`${input} w-12 text-center`}
                />
                <span className="text-white/40">-</span>
                <input
                  type="number"
                  min={0}
                  value={m.as}
                  onChange={(e) => set(m.id, "as", e.target.value)}
                  className={`${input} w-12 text-center`}
                />
                <span className="min-w-[8rem] flex-1 font-medium">
                  {awayName} {away?.flag}
                </span>
                <button
                  disabled={savingId === m.id}
                  onClick={() => saveResult(m.id)}
                  className="rounded-lg bg-nx-grad px-3 py-1 font-semibold text-white disabled:opacity-60"
                >
                  Guardar
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                <span>Inicio:</span>
                <input
                  type="datetime-local"
                  value={m.ko}
                  onChange={(e) => set(m.id, "ko", e.target.value)}
                  className={input}
                />
                <button
                  disabled={savingId === m.id}
                  onClick={() => saveKickoff(m.id)}
                  className="rounded-lg border border-white/15 px-2 py-1 font-medium hover:border-nxpink"
                >
                  Actualizar hora
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
