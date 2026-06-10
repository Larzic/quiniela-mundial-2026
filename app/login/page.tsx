"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  const input =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-nxpink";

  return (
    <div className="mx-auto mt-6 max-w-sm">
      <div className="mb-6 text-center">
        <div className="mb-3 inline-block rounded-full bg-nx-grad px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-nx-glow">
          ¡Vive la pasión y gana más!
        </div>
        <h1 className="text-3xl font-black">
          Quiniela <span className="text-nxteal">Mundial 2026</span>
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Pronostica los partidos, reta a tus colegas y sube en la tabla.
        </p>
      </div>

      <div className="nx-card rounded-2xl p-5">
        <h2 className="mb-1 text-lg font-bold">Entrar a la quiniela</h2>
        <p className="mb-5 text-sm text-white/50">
          Te enviaremos un enlace de acceso a tu correo. Ábrelo desde este mismo
          dispositivo y entrarás automáticamente.
        </p>

        {sent ? (
          <div className="rounded-xl border border-nxteal/30 bg-nxteal/10 p-4 text-sm">
            <p className="font-semibold text-nxteal">¡Revisa tu correo! 📧</p>
            <p className="mt-1 text-white/80">
              Te enviamos un enlace a{" "}
              <span className="font-medium">{email}</span>. Haz clic en{" "}
              <b>“Sign in”</b> para entrar. Si no lo ves, revisa spam.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-3 text-nxteal underline"
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">
                Tu nombre
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como aparecerás en la tabla"
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">
                Correo
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className={input}
              />
            </div>
            <button
              disabled={loading}
              className="w-full rounded-lg bg-nx-grad py-2.5 font-semibold text-white shadow-nx-glow transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Enviando…" : "Enviar enlace de acceso"}
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
