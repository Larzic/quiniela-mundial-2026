"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, Match } from "@/lib/types";

function toLocalInput(iso: string) {
  // ISO -> valor para <input type="datetime-local"> en hora local
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminResults({
  teams,
  matches,
}: {
  teams: Team[];
  matches: Match[];
}) {
  const supabase = createClient();
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
    setOkId(null);
    setError(null);
    const { error } = await supabase
      .from("matches")
      .update({ kickoff_at: new Date(r.ko).toISOString() })
      .eq("id", id);
    setSavingId(null);
    if (error) setError(error.message);
    else setOkId(id);
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {rows.map((m) => {
        const home = teamById[m.home_team_id];
        const away = teamById[m.away_team_id];
        return (
          <div
            key={m.id}
            className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
          >
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>
                Grupo {m.group_letter} · J{m.matchday}
              </span>
              {okId === m.id && (
                <span className="font-semibold text-emerald-600">Guardado ✓</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-[8rem] flex-1 text-right font-medium">
                {home?.flag} {home?.name}
              </span>
              <input
                type="number"
                min={0}
                value={m.hs}
                onChange={(e) => set(m.id, "hs", e.target.value)}
                className="w-12 rounded border border-slate-300 px-2 py-1 text-center"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                min={0}
                value={m.as}
                onChange={(e) => set(m.id, "as", e.target.value)}
                className="w-12 rounded border border-slate-300 px-2 py-1 text-center"
              />
              <span className="min-w-[8rem] flex-1 font-medium">
                {away?.name} {away?.flag}
              </span>
              <button
                disabled={savingId === m.id}
                onClick={() => saveResult(m.id)}
                className="rounded-lg bg-pitch px-3 py-1 font-semibold text-white hover:bg-pitchDark disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>Inicio:</span>
              <input
                type="datetime-local"
                value={m.ko}
                onChange={(e) => set(m.id, "ko", e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
              <button
                disabled={savingId === m.id}
                onClick={() => saveKickoff(m.id)}
                className="rounded-lg border border-slate-300 px-2 py-1 font-medium hover:border-pitch"
              >
                Actualizar hora
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
