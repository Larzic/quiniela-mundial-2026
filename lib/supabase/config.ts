// Configuración de conexión a Supabase.
// Usa variables de entorno si están definidas; si no, cae a los valores
// públicos del proyecto (la "publishable key" es segura para el navegador
// porque los datos están protegidos por Row Level Security).
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://jamnvwotzkxpznknutag.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_caxboNOhI58WVU_uqUal5w_kiEc5uwZ";
