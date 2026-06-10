"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/quiniela");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">Entrar a la quiniela</h1>
      <p className="mb-6 text-sm text-slate-500">
        Te enviaremos un código de verificación a tu correo.
      </p>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-4">
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
            {loading ? "Enviando…" : "Enviar código"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-sm text-slate-600">
            Revisa <span className="font-medium">{email}</span> e ingresa el código de 6 dígitos.
          </p>
          <input
            required
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest"
          />
          <button
            disabled={loading}
            className="w-full rounded-lg bg-pitch py-2 font-semibold text-white hover:bg-pitchDark disabled:opacity-60"
          >
            {loading ? "Verificando…" : "Verificar y entrar"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full text-sm text-slate-500 hover:underline"
          >
            Usar otro correo
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
