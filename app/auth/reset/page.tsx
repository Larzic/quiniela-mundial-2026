"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

// Página a la que llega el usuario tras hacer clic en el enlace de
// recuperación del correo (ya con sesión iniciada por el callback).
// Aquí escribe su nueva contraseña.
export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setReady(true);
    });
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("No se pudo actualizar la contraseña. Intenta de nuevo.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/quiniela");
      router.refresh();
    }, 1200);
  }

  const input =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-nxpink";

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <h1 className="mb-1 text-2xl font-black">Nueva contraseña</h1>

      <div className="nx-card mt-4 rounded-2xl p-5">
        {!ready ? (
          <p className="text-sm text-white/50">Un momento…</p>
        ) : done ? (
          <p className="rounded-lg bg-nxteal/15 px-3 py-2 text-sm text-nxteal">
            ✅ Listo, tu contraseña fue actualizada. Entrando…
          </p>
        ) : !hasSession ? (
          <div className="space-y-3 text-sm text-white/60">
            <p>
              Este enlace no es válido o ya expiró. Vuelve a pedir el correo de
              recuperación desde la pantalla de acceso.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full rounded-lg bg-nx-grad py-2.5 font-semibold text-white shadow-nx-glow"
            >
              Ir a acceder
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-white/50">
              Escribe tu nueva contraseña para tu cuenta de la quiniela.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">
                Nueva contraseña
              </label>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">
                Repite la contraseña
              </label>
              <input
                required
                type="password"
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Vuelve a escribirla"
                className={input}
              />
            </div>
            <button
              disabled={loading}
              className="w-full rounded-lg bg-nx-grad py-2.5 font-semibold text-white shadow-nx-glow transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-nxred/15 px-3 py-2 text-sm text-nxred">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
