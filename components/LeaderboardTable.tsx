"use client";

import { useState } from "react";
import type { LeaderboardRow, PlayerHistoryRow } from "@/lib/types";

function badgesFor(hist: PlayerHistoryRow[]) {
  const sorted = [...hist].sort((a, b) =>
    a.kickoff_at.localeCompare(b.kickoff_at)
  );
  const exactos = sorted.filter((h) => h.points === 3).length;
  let best = 0;
  let cur = 0;
  for (const h of sorted) {
    if (h.points > 0) {
      cur++;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  const aciertos = sorted.filter((h) => h.points > 0).length;
  return { exactos, streak: best, aciertos, jugados: sorted.length };
}

function Medal({
  show,
  emoji,
  label,
}: {
  show: boolean;
  emoji: string;
  label: string;
}) {
  if (!show) return null;
  return (
    <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">
      {emoji} {label}
    </span>
  );
}

export default function LeaderboardTable({
  rows,
  history,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  history: PlayerHistoryRow[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  // Lugar por puntos (empates comparten lugar)
  const ranks = rows.map(
    (r) => 1 + rows.filter((o) => o.points > r.points).length
  );
  const histByUser: Record<string, PlayerHistoryRow[]> = {};
  for (const h of history) (histByUser[h.user_id] ??= []).push(h);

  return (
    <div className="nx-card overflow-hidden rounded-2xl">
      <div className="flex items-center bg-white/5 px-4 py-2 text-xs text-white/50">
        <span className="w-8">#</span>
        <span className="flex-1">Jugador</span>
        <span className="w-16 text-right">Aciertos</span>
        <span className="w-14 text-right">Puntos</span>
        <span className="w-6" />
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((r, i) => {
          const b = badgesFor(histByUser[r.user_id] ?? []);
          const isOpen = open === r.user_id;
          return (
            <div key={r.user_id}>
              <button
                onClick={() => setOpen(isOpen ? null : r.user_id)}
                className={`flex w-full items-center px-4 py-2 text-left text-sm transition hover:bg-white/5 ${
                  r.user_id === currentUserId ? "bg-nxpink/10" : ""
                }`}
              >
                <span className="w-8 font-semibold text-white/40">
                  {ranks[i]}
                </span>
                <span className="flex-1 truncate font-medium">
                  {r.display_name}
                  {b.exactos > 0 && (
                    <span className="ml-1 text-[11px]" title="Marcadores exactos">
                      🎯{b.exactos}
                    </span>
                  )}
                  {b.streak >= 2 && (
                    <span className="ml-1 text-[11px]" title="Racha de aciertos">
                      🔥{b.streak}
                    </span>
                  )}
                </span>
                <span className="w-16 text-right text-white/50">
                  {r.hits}/{r.predictions}
                </span>
                <span className="w-14 text-right font-black text-nxteal">
                  {r.points}
                </span>
                <span className="w-6 text-center text-xs text-white/40">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <div className="bg-black/20 px-4 py-3">
                  <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
                    <Medal
                      show={b.exactos > 0}
                      emoji="🎯"
                      label={`${b.exactos} marcador${
                        b.exactos === 1 ? "" : "es"
                      } exacto${b.exactos === 1 ? "" : "s"}`}
                    />
                    <Medal
                      show={b.streak >= 2}
                      emoji="🔥"
                      label={`Racha de ${b.streak} aciertos`}
                    />
                    <Medal
                      show={b.jugados >= 3 && b.aciertos === b.jugados}
                      emoji="💎"
                      label="Infalible"
                    />
                    <Medal
                      show={b.aciertos > 0}
                      emoji="✅"
                      label={`${b.aciertos} aciertos`}
                    />
                    {b.exactos === 0 && b.streak < 2 && b.aciertos === 0 && (
                      <span className="text-white/30">
                        Sin logros todavía · ¡a acertar!
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {(histByUser[r.user_id] ?? []).length === 0 ? (
                      <p className="text-xs text-white/40">
                        Aún no tiene partidos finalizados.
                      </p>
                    ) : (
                      [...(histByUser[r.user_id] ?? [])]
                        .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at))
                        .map((h) => (
                          <div
                            key={h.match_id}
                            className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-[11px]"
                          >
                            <span className="flex-1 truncate">
                              {h.home_flag} {h.home_team}{" "}
                              <b className="text-white/80">
                                {h.home_score}-{h.away_score}
                              </b>{" "}
                              {h.away_team} {h.away_flag}
                            </span>
                            <span className="text-white/50">
                              tú: {h.pred_home}-{h.pred_away}
                            </span>
                            <span
                              className={`w-8 text-right font-bold ${
                                h.points > 0 ? "text-nxteal" : "text-white/30"
                              }`}
                            >
                              +{h.points}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="px-4 py-6 text-center text-white/40">
            Aún no hay jugadores.
          </div>
        )}
      </div>
    </div>
  );
}
