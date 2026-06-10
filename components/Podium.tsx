import type { LeaderboardRow } from "@/lib/types";

function Step({
  row,
  place,
}: {
  row: LeaderboardRow | undefined;
  place: 1 | 2 | 3;
}) {
  const cfg = {
    1: { medal: "🥇", h: "h-28", ring: "border-nxpink", glow: "shadow-nx-glow" },
    2: { medal: "🥈", h: "h-20", ring: "border-white/20", glow: "" },
    3: { medal: "🥉", h: "h-16", ring: "border-nxteal/40", glow: "" },
  }[place];

  return (
    <div className="flex w-1/3 flex-col items-center justify-end">
      <div className="mb-2 text-center">
        <div className="text-3xl">{cfg.medal}</div>
        <div className="mt-1 max-w-[7rem] truncate text-sm font-bold">
          {row?.display_name ?? "—"}
        </div>
        <div className="text-xs text-nxteal">{row ? `${row.points} pts` : ""}</div>
      </div>
      <div
        className={`w-full rounded-t-xl border-x border-t bg-white/5 ${cfg.ring} ${cfg.h} ${cfg.glow} flex items-start justify-center pt-2 text-lg font-black text-white/40`}
      >
        {place}
      </div>
    </div>
  );
}

export default function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const withPoints = rows.filter((r) => r.predictions > 0);
  if (withPoints.length === 0) {
    return (
      <div className="nx-card rounded-2xl p-6 text-center text-sm text-white/50">
        El podio aparecerá cuando se carguen los primeros resultados. ¡Haz tus
        pronósticos!
      </div>
    );
  }
  return (
    <div className="nx-card rounded-2xl p-5">
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-nxpink">
        🏆 Podio momentáneo
      </h2>
      <div className="flex items-end gap-2">
        <Step row={withPoints[1]} place={2} />
        <Step row={withPoints[0]} place={1} />
        <Step row={withPoints[2]} place={3} />
      </div>
    </div>
  );
}
