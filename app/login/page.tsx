"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [mode, setMode] = useState<"register" | "login" | "forgot">(
    "register"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Recuerda nombre y correo del jugador
  useEffect(() => {
    const e = localStorage.getItem("qm_email");
    if (e) setEmail(e);
    const n = localStorage.getItem("qm_name");
    if (n) setName(n);
  }, []);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    localStorage.setItem("qm_email", email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    setLoading(false);
    if (error) {
      setError(
        "No pudimos enviar el correo. Revisa que el correo esté bien escrito."
      );
      return;
    }
    setNotice(
      "Te enviamos un correo con un enlace para crear una nueva contraseña. Revisa tu bandeja (y spam)."
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    localStorage.setItem("qm_email", email);
    if (name) localStorage.setItem("qm_name", name);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      });
      if (error) {
        setLoading(false);
        const m = error.message.toLowerCase();
        if (m.includes("already") || m.includes("registered")) {
          setError(
            "Ese correo ya está registrado. Cambia a “Ya tengo cuenta” para entrar."
          );
        } else if (m.includes("password")) {
          setError("La contraseña debe tener al menos 6 caracteres.");
        } else {
          setError(error.message);
        }
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setLoading(false);
        setError("Correo o contraseña incorrectos.");
        return;
      }
    }
    router.push("/quiniela");
    router.refresh();
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
        {/* Toggle registro / entrar */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1 text-sm">
          <button
            onClick={() => {
              setMode("register");
              setError(null);
              setNotice(null);
            }}
            className={`rounded-md py-1.5 font-semibold transition ${
              mode === "register" ? "bg-nx-grad text-white" : "text-white/60"
            }`}
          >
            Crear cuenta
          </button>
          <button
            onClick={() => {
              setMode("login");
              setError(null);
              setNotice(null);
            }}
            className={`rounded-md py-1.5 font-semibold transition ${
              mode === "login" ? "bg-nx-grad text-white" : "text-white/60"
            }`}
          >
            Ya tengo cuenta
          </button>
        </div>

        <p className="mb-4 text-sm text-white/50">
          {mode === "register"
            ? "Regístrate con tu correo de la empresa y una contraseña."
            : mode === "login"
              ? "Entra con tu correo de la empresa y tu contraseña."
              : "Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña."}
        </p>

        {mode === "forgot" ? (
          <form onSubmit={sendReset} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">
                Correo de la empresa
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tunombre@nxtara.com"
                className={input}
              />
            </div>
            <button
              disabled={loading}
              className="w-full rounded-lg bg-nx-grad py-2.5 font-semibold text-white shadow-nx-glow transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Enviando…" : "Enviar enlace de recuperación"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setNotice(null);
              }}
              className="w-full text-center text-sm text-white/50 hover:text-white/80"
            >
              ← Volver
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
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
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">
                Correo de la empresa
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tunombre@nxtara.com"
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">
                Contraseña
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
            <button
              disabled={loading}
              className="w-full rounded-lg bg-nx-grad py-2.5 font-semibold text-white shadow-nx-glow transition hover:opacity-90 disabled:opacity-60"
            >
              {loading
                ? "Un momento…"
                : mode === "register"
                  ? "Crear cuenta y entrar"
                  : "Entrar"}
            </button>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setNotice(null);
                }}
                className="w-full text-center text-sm text-nxteal hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </form>
        )}

        {notice && (
          <p className="mt-4 rounded-lg bg-nxteal/15 px-3 py-2 text-sm text-nxteal">
            {notice}
          </p>
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
