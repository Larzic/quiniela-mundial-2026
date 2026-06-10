import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Quiniela Mundial 2026",
  description: "Pronostica los partidos de la fase de grupos del Mundial 2026",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, is_admin")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? "";
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <html lang="es">
      <body>
        <NavBar
          loggedIn={!!user}
          displayName={displayName}
          isAdmin={isAdmin}
        />
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
