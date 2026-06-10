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
        <footer className="mx-auto max-w-3xl px-4 py-8 text-center text-xs text-white/40">
          <div className="mb-2 flex items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.nxtara.com/static/img/nxtara.png"
              alt="Nxtara"
              className="h-4 w-auto opacity-70"
            />
          </div>
          Juega responsablemente · Solo pronósticos entre amigos · +18
        </footer>
      </body>
    </html>
  );
}
