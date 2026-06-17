import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Podium from "@/components/Podium";
import AutoSync from "@/components/AutoSync";
import TodayBanner from "@/components/TodayBanner";
import LeaderboardTable from "@/components/LeaderboardTable";
import type { LeaderboardRow, PlayerHistoryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: lb }, { data: hist }] = await Promise.all([
    supabase.from("leaderboard").select("*"),
    supabase.from("player_history").select("*"),
  ]);
  const rows = (lb ?? []) as LeaderboardRow[];
  const history = (hist ?? []) as PlayerHistoryRow[];

  return (
    <div className="space-y-6">
      <AutoSync />
      <div>
        <TodayBanner />
      </div>
      <div>
        <h1 className="text-2xl font-black">Tabla de posiciones</h1>
        <p className="mt-1 text-sm text-white/50">
          Toca un jugador para ver su <b className="text-white">historial</b> de
          aciertos y sus <b className="text-nxpink">logros</b> 🏅
        </p>
      </div>

      <Podium rows={rows} />

      <LeaderboardTable rows={rows} history={history} currentUserId={user.id} />
    </div>
  );
}
