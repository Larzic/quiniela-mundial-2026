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

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">Entrar a la quiniela</h1>
      <p className="mb-6 text-sm text-slate-500">
        Te enviaremos un enlace de acceso a tu correo. Ábrelo desde este mismo
        dispositivo y entrarás automáticamente.
      </p>

      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">¡Revisa tu correo! 📧</p>
          <p className="mt-1">
            Te enviamos un enlace a <span className="font-medium">{email}</span>.
            Haz clic en <b>“Sign in”</b> para entrar. Si no lo ves, revisa spam.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-3 text-emerald-700 underline"
          >
            Usar otro correo
          </button>
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tu nombre</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como aparecerás en la tabla"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Correo</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-pitch py-2 font-semibold text-white hover:bg-pitchDark disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar enlace de acceso"}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
