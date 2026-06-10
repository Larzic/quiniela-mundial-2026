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
    <header className="bg-pitchDark text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold tracking-tight">
          ⚽ Quiniela Mundial 2026
        </Link>
        {loggedIn ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/quiniela" className="hover:underline">
              Pronósticos
            </Link>
            <Link href="/leaderboard" className="hover:underline">
              Tabla
            </Link>
            {isAdmin && (
              <Link href="/admin" className="hover:underline">
                Admin
              </Link>
            )}
            <span className="hidden text-emerald-200 sm:inline">
              {displayName}
            </span>
            <button onClick={logout} className="rounded bg-white/15 px-2 py-1 hover:bg-white/25">
              Salir
            </button>
          </nav>
        ) : (
          <Link href="/login" className="text-sm hover:underline">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
