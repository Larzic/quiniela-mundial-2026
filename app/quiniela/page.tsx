import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PredictionGrid from "@/components/PredictionGrid";
import NicknameEditor from "@/components/NicknameEditor";
import AutoSync from "@/components/AutoSync";
import type { Team, Match, Prediction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuinielaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: teams }, { data: matches }, { data: predictions }, { data: profile }] =
    await Promise.all([
      supabase.from("teams").select("*").order("id"),
      supabase
        .from("matches")
        .select("*")
        .order("kickoff_at")
        .order("group_letter"),
      supabase.from("predictions").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    ]);

  return (
    <div>
      <AutoSync />
      <h1 className="mb-1 text-2xl font-black">Tus pronósticos</h1>
      <p className="mb-6 text-sm text-white/50">
        Escribe los <b className="text-white">goles de cada equipo</b> y guarda
        tu marcador. Puedes cambiarlo hasta{" "}
        <b className="text-nxteal">que empiece</b> cada partido. Puntos:{" "}
        <b className="text-white">1 punto</b> por acertar quién gana o el empate,
        y <b className="text-white">+2 adicionales</b> si aciertas el marcador
        exacto <span className="text-white/60">(3 en total)</span>.
      </p>
      <div className="mb-6">
        <NicknameEditor
          userId={user.id}
          initial={profile?.display_name ?? ""}
        />
      </div>
      <PredictionGrid
        teams={(teams ?? []) as Team[]}
        matches={(matches ?? []) as Match[]}
        predictions={(predictions ?? []) as Prediction[]}
        userId={user.id}
      />
    </div>
  );
}
