import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recibe el clic del enlace mágico: intercambia el código por una sesión
// y redirige a la quiniela.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/quiniela";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=enlace_invalido`);
}
