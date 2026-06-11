"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Dispara la sincronización de resultados (ESPN -> BD) al cargar y cada 60s.
// Si entran resultados nuevos, refresca la página para mostrar puntos/tabla.
export default function AutoSync() {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const r = await fetch("/api/sync");
        const d = await r.json();
        if (active && d?.updated > 0) router.refresh();
      } catch {}
    }
    run();
    const t = setInterval(run, 60000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [router]);
  return null;
}
