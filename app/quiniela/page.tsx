import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PredictionGrid from "@/components/PredictionGrid";
import type { Team, Match, Prediction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuinielaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: teams }, { data: matches }, { data: predictions }] =
    await Promise.all([
      supabase.from("teams").select("*").order("id"),
      supabase
        .from("matches")
        .select("*")
        .order("kickoff_at")
        .order("group_letter"),
      supabase.from("predictions").select("*").eq("user_id", user.id),
    ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-black">Tus pronósticos</h1>
      <p className="mb-6 text-sm text-white/50">
        Elige <b className="text-white">Local (1)</b>,{" "}
        <b className="text-white">Empate (X)</b> o{" "}
        <b className="text-white">Visitante (2)</b>. Puedes guardar y cambiar tu
        pronóstico hasta <b className="text-nxteal">1 hora antes</b> de cada
        partido. Cada acierto suma puntos.
      </p>
      <PredictionGrid
        teams={(teams ?? []) as Team[]}
        matches={(matches ?? []) as Match[]}
        predictions={(predictions ?? []) as Prediction[]}
        userId={user.id}
      />
    </div>
  );
}
