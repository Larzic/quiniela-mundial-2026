"use client";

import { useEffect, useState } from "react";
import type { LiveEvent } from "@/lib/livescores";

// Banner con los partidos del día (ESPN): horario si no han empezado,
// 🔴 EN VIVO con marcador si se juegan, o el resultado si ya terminaron.
export default function TodayBanner() {
  const [events, setEvents] = useState<LiveEvent[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await fetch("/api/live");
        const d = await r.json();
        if (active) setEvents(d.events ?? []);
      } catch {}
    }
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="nx-card rounded-2xl p-3">
      <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-nxpink">
        ⚽ Partidos de hoy
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {events.map((ev, i) => {
          const home =
            ev.teams.find((t) => t.homeAway === "home") ?? ev.teams[0];
          const away =
            ev.teams.find((t) => t.homeAway === "away") ?? ev.teams[1];
          const time = ev.date
            ? new Date(ev.date).toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          return (
            <div
              key={i}
              className="min-w-[9.5rem] shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-center text-xs"
            >
              <div className="truncate font-semibold">{home?.name}</div>
              <div className="my-0.5 text-base font-black">
                {ev.state === "pre"
                  ? "vs"
                  : `${home?.score} - ${away?.score}`}
              </div>
              <div className="truncate font-semibold">{away?.name}</div>
              <div className="mt-1 text-[10px]">
                {ev.state === "in" ? (
                  <span className="font-bold text-nxred">
                    🔴 EN VIVO {ev.clock}
                  </span>
                ) : ev.state === "post" ? (
                  <span className="text-white/50">✅ Final</span>
                ) : (
                  <span className="text-nxteal">🕒 {time}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
