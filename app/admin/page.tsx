import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminResults from "@/components/AdminResults";
import type { Team, Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-800">
        No tienes permisos de administrador.
      </p>
    );
  }

  const [{ data: teams }, { data: matches }] = await Promise.all([
    supabase.from("teams").select("*").order("id"),
    supabase.from("matches").select("*").order("kickoff_at"),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Panel de administración</h1>
      <p className="mb-6 text-sm text-slate-500">
        Carga el marcador final de cada partido. Al guardar, se recalculan
        automáticamente los puntos de todos los jugadores.
      </p>
      <AdminResults
        teams={(teams ?? []) as Team[]}
        matches={(matches ?? []) as Match[]}
      />
    </div>
  );
}
