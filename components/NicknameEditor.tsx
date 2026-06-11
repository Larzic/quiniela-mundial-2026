"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NicknameEditor({
  userId,
  initial,
}: {
  userId: string;
  initial: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Escribe un nombre.");
      return;
    }
    setSaving(true);
    setErr(null);
    setOk(false);
    let { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId);
    if (error) {
      await supabase.auth.refreshSession();
      ({ error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", userId));
    }
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOk(true);
    router.refresh();
  }

  const changed = name.trim() !== initial.trim();

  return (
    <div className="nx-card flex flex-wrap items-center gap-2 rounded-xl p-3">
      <span className="text-sm text-white/60">Tu nombre en la tabla:</span>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setOk(false);
        }}
        className="min-w-[8rem] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-white outline-none focus:border-nxpink"
      />
      <button
        onClick={save}
        disabled={saving || !changed}
        className="rounded-lg bg-nx-grad px-4 py-1.5 text-sm font-semibold text-white shadow-nx-glow disabled:opacity-40"
      >
        {saving ? "Guardando…" : ok && !changed ? "Guardado ✓" : "Guardar"}
      </button>
      {err && <span className="w-full text-xs text-nxred">{err}</span>}
    </div>
  );
}
