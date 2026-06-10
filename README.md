# ⚽ Quiniela Mundial 2026

App para que tu grupo pronostique los partidos de la **fase de grupos** del Mundial 2026.
Registro por **código de verificación al correo**, pronóstico **1X2** (Local / Empate / Visitante),
puntuación automática y **tabla de posiciones** en vivo.

- **Frontend:** Next.js 14 (App Router) → se despliega en **Vercel**
- **Backend:** **Supabase** (Postgres + Auth con código por correo)

---

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**. Apunta la contraseña de la base de datos.
2. Cuando esté listo, ve a **SQL Editor** y ejecuta, en este orden:
   - El contenido de `supabase/migrations/0001_init.sql` (crea tablas, seguridad y la lógica de puntos).
   - El contenido de `supabase/seed.sql` (carga los 12 grupos y los 72 partidos).
3. Ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Configurar el correo con código de 6 dígitos

Por defecto Supabase envía un *magic link*. Para que llegue el **código numérico**:

1. **Authentication → Providers → Email**: deja activado *Enable Email provider* y *Confirm email*.
2. **Authentication → Email Templates → "Magic Link"**: en el cuerpo del correo usa el token, por ejemplo:

   ```
   Tu código para entrar a la Quiniela es: {{ .Token }}
   ```

3. (Recomendado para producción) Configura un **SMTP propio** en
   *Authentication → Settings → SMTP* (SendGrid, Resend, Gmail, etc.). El SMTP de
   prueba de Supabase limita el envío a unos pocos correos por hora — suficiente
   para probar, insuficiente para inscribir a todo el grupo.
4. En **Authentication → URL Configuration**, agrega la URL de tu sitio de Vercel
   en *Site URL* y *Redirect URLs* (p. ej. `https://tu-quiniela.vercel.app`).

---

## 2. Probar en local

```bash
cp .env.local.example .env.local   # y rellena las dos variables
npm install
npm run dev
```

Abre http://localhost:3000

---

## 3. Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**. Copia la URL final y agrégala a las *Redirect URLs* de Supabase (paso 1).

---

## 4. Hacerte administrador

El admin es quien carga los marcadores. Después de iniciar sesión al menos una vez,
ve al **SQL Editor** de Supabase y ejecuta (con tu correo):

```sql
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'TU-CORREO@ejemplo.com');
```

Vuelve a entrar y verás el menú **Admin** para cargar resultados.

---

## 5. Cómo funciona la puntuación

- Cada jugador elige **1** (gana local), **X** (empate) o **2** (gana visitante).
- Puede cambiar su elección **hasta la hora de inicio** del partido (`kickoff_at`).
- Cuando el admin guarda el marcador final, un *trigger* recalcula los puntos:
  **acertar el 1X2 = 3 puntos** (cámbialo en la función `points_per_hit()` del SQL).
- La **tabla de posiciones** suma los puntos sin revelar los pronósticos de los demás.

---

## ⚠️ Antes de abrirla al grupo

- **Verifica la composición de los grupos** y, sobre todo, las **fechas y horas**
  de los 72 partidos contra el sitio oficial de FIFA. En el seed las horas son
  ventanas aproximadas por jornada; ajústalas desde **Admin → "Actualizar hora"**
  (el cierre de pronósticos depende de esa hora).
- Si manejas dinero entre amigos, recuerda que eso corre por tu cuenta y depende
  de las reglas/leyes de tu país; esta app solo registra pronósticos y puntos.

---

## Estructura

```
app/            páginas (login, quiniela, leaderboard, admin)
components/      NavBar, PredictionGrid, AdminResults
lib/supabase/   clientes de Supabase (browser, server, middleware)
supabase/       0001_init.sql (esquema) y seed.sql (datos)
```
