import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("leaderboard").select("*");
  const rows = (data ?? []) as LeaderboardRow[];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Tabla de posiciones</h1>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 w-10">#</th>
              <th className="px-4 py-2">Jugador</th>
              <th className="px-4 py-2 text-right">Aciertos</th>
              <th className="px-4 py-2 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.user_id}
                className={[
                  "border-t border-slate-100",
                  r.user_id === user.id ? "bg-emerald-50" : "",
                ].join(" ")}
              >
                <td className="px-4 py-2 font-semibold text-slate-400">
                  {i + 1}
                </td>
                <td className="px-4 py-2 font-medium">{r.display_name}</td>
                <td className="px-4 py-2 text-right text-slate-500">
                  {r.hits}/{r.predictions}
                </td>
                <td className="px-4 py-2 text-right font-bold text-pitchDark">
                  {r.points}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Aún no hay jugadores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
