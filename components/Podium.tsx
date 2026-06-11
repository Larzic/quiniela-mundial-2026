import type { LeaderboardRow } from "@/lib/types";

function Step({ row, rank }: { row?: LeaderboardRow; rank: number }) {
  const medal =
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const h = rank === 1 ? "h-28" : rank === 2 ? "h-20" : "h-16";
  const ring =
    rank === 1
      ? "border-nxpink"
      : rank === 3
        ? "border-nxteal/40"
        : "border-white/20";
  const glow = rank === 1 ? "shadow-nx-glow" : "";

  return (
    <div className="flex w-1/3 flex-col items-center justify-end">
      <div className="mb-2 text-center">
        <div className="text-3xl">{row ? medal : "—"}</div>
        <div className="mt-1 max-w-[7rem] truncate text-sm font-bold">
          {row?.display_name ?? "—"}
        </div>
        <div className="text-xs text-nxteal">
          {row ? `${row.points} pts` : ""}
        </div>
      </div>
      <div
        className={`w-full rounded-t-xl border-x border-t bg-white/5 ${ring} ${h} ${glow} flex items-start justify-center pt-2 text-lg font-black text-white/40`}
      >
        {row ? rank : ""}
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
  // Lugar por PUNTOS, con empates compartiendo el mismo lugar.
  const rankOf = (r: LeaderboardRow) =>
    1 + withPoints.filter((o) => o.points > r.points).length;
  const top = withPoints.slice(0, 3);

  return (
    <div className="nx-card rounded-2xl p-5">
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-nxpink">
        🏆 Podio momentáneo
      </h2>
      <div className="flex items-end gap-2">
        <Step row={top[1]} rank={top[1] ? rankOf(top[1]) : 2} />
        <Step row={top[0]} rank={top[0] ? rankOf(top[0]) : 1} />
        <Step row={top[2]} rank={top[2] ? rankOf(top[2]) : 3} />
      </div>
      <p className="mt-3 text-center text-[10px] text-white/40">
        Empates en puntos comparten el mismo lugar
      </p>
    </div>
  );
}
