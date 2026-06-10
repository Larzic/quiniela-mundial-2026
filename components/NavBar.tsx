"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NavBar({
  loggedIn,
  displayName,
  isAdmin,
}: {
  loggedIn: boolean;
  displayName: string;
  isAdmin: boolean;
}) {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.nxtara.com/static/img/nxtara.png"
            alt="Nxtara"
            className="h-6 w-auto"
          />
          <span className="hidden text-sm font-semibold text-white/70 sm:inline">
            · Quiniela Mundial 2026
          </span>
        </Link>
        {loggedIn ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/quiniela" className="text-white/80 hover:text-nxteal">
              Pronósticos
            </Link>
            <Link href="/leaderboard" className="text-white/80 hover:text-nxteal">
              Tabla
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-white/80 hover:text-nxteal">
                Admin
              </Link>
            )}
            <span className="hidden text-nxteal sm:inline">{displayName}</span>
            <button
              onClick={logout}
              className="rounded-full border border-white/15 px-3 py-1 text-white/80 hover:border-nxpink hover:text-white"
            >
              Salir
            </button>
          </nav>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-nx-grad px-4 py-1.5 text-sm font-semibold text-white shadow-nx-glow"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
