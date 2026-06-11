import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Podium from "@/components/Podium";
import AutoSync from "@/components/AutoSync";
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
    <div className="space-y-6">
      <AutoSync />
      <h1 className="text-2xl font-black">Tabla de posiciones</h1>

      <Podium rows={rows} />

      <div className="nx-card overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/50">
            <tr>
              <th className="w-10 px-4 py-2">#</th>
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
                  "border-t border-white/5",
                  r.user_id === user.id ? "bg-nxpink/10" : "",
                ].join(" ")}
              >
                <td className="px-4 py-2 font-semibold text-white/40">
                  {i + 1}
                </td>
                <td className="px-4 py-2 font-medium">{r.display_name}</td>
                <td className="px-4 py-2 text-right text-white/50">
                  {r.hits}/{r.predictions}
                </td>
                <td className="px-4 py-2 text-right font-black text-nxteal">
                  {r.points}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-white/40">
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
