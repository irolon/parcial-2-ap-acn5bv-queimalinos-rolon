# Plan — Auth e invitaciones en la web

- **Spec:** `docs/superpowers/specs/2026-10-18-web-auth-invitations-design.md` (autoridad; ante conflicto, manda el spec).
- **Rama:** `feature/web-auth-invitations` (apilada sobre `feature/web-skeleton`).
- **Diseño:** `git show origin/docs/design-prototypes:docs/design/prototype-src/pt-screens.jsx` (`PTGenerarQR`, líneas ~293-438) y `pt-dashboard.jsx`.

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código (`.js`, `.jsx`, tests incluidos) pasa de 200 líneas; capa → módulo → archivo (módulos = recurso de la API en inglés: `auth`, `invitations`, `students`); tests espejan `src/`; helpers en `tests/helpers/<módulo>/`; ninguna carpeta con más de 10 archivos (`components/shared/layout` ya tiene 9).
- Reutilizar lo del esqueleto: `api/shared/client.js` (`api.get/post`, `ApiError`, opciones `auth`/`refresh`), `useAuthStore`, `components/shared/ui` (Button, Input, Card, Pill, Avatar, BrandMark), `components/shared/states`, `routes/` (`ROLES`, `homeFor`, `GuestOnly`, `RequireRole`), `pages/auth/loginErrors.js` como patrón de errores, helpers de test (`stubFetch`, `jsonResponse`, `errorResponse`, `renderRoute`, `setSession`, `resetAuthStore`).
- Textos de la UI en español rioplatense, tema oscuro, tokens del prototipo (no colores sueltos).
- Versiones exactas en `package.json` (sin `^`/`~`); commitear el lockfile.
- Commits Conventional Commits en español (scope `web` o `invitations`). **Sin firma de asistentes.** No pushear.
- Nunca leer ni tocar `backend/.env` ni `frontend/.env`.
- Verificación antes de cada commit: en `frontend/` `npm run lint`, `npm test`, `npm run build`; si se toca `backend/`, `npm run lint` y `npm test` ahí.

## Task 1: Backend — objetivo opcional, contrato y ADR

- `backend/src/validations/invitations/invitations.validation.js`: `goal` opcional (ausente o `null` → `null`; si viene, uno de los 4 valores). Ajustar el service si hace falta para guardar `student_goal = null`.
- Tests de la validación y del service (con y sin `goal`; `goal` inválido sigue fallando).
- `docs/arquitectura/contratos-api.md`: en `POST /invitations`, `goal` opcional y documentar `level`, `gym_equipment`, `injuries` (reglas reales de la validación).
- `docs/adr/0002-sesion-web.md`: ADR según el spec §2 ADR, con el formato del 0001 (contexto, decisión, alternativas, consecuencias) y frontmatter del vault como las notas de `docs/`.

**Commit:** `feat(invitations): objetivo opcional al invitar, contrato y ADR de sesión web`

## Task 2: API y sesión en la web

- `api/auth/auth.api.js`: `register({ name, email, password, specialty })` → `POST /auth/register` (`auth:false`, `refresh:false`).
- `api/invitations/invitations.api.js`: `createInvitation(data)` → `POST /invitations` (devuelve `data` desempaquetado); `getInvitation(token)` → `GET /invitations/:token` (`auth:false`, `refresh:false`).
- `api/students/students.api.js`: `joinFromInvitation({ token, password })` → `POST /students` (`auth:false`, `refresh:false`).
- `hooks/auth/useAuthStore.js`: acciones `register(data)` y `joinFromInvitation(data)` que guardan sesión como `login` (`user = { ...trainer, role:'trainer' }` / `{ ...student, role:'student' }`, token en memoria, refresh persistido, `status:'authenticated'`) y devuelven el user; si el archivo pasa de 200 líneas, extraer la lógica común de "guardar sesión" a otro archivo en `hooks/auth/`.
- Tests de las tres APIs (paths, bodies, que no disparan refresh) y del store (register y join guardan sesión, rol correcto, no persisten el token; errores se relanzan).

**Commit:** `feat(web): API de registro, invitaciones y alta de alumno`

## Task 3: Registro del entrenador

- `components/shared/ui/Select.jsx` (mismo estilo que `Input`: 46 px, `rounded-md`, `bg-ink1`, `border-ink3`, etiqueta mono 9 px, foco `accentText`, `error` accesible; opciones `{ value, label }`).
- `pages/auth/RegisterPage.jsx` (+ `registerErrors.js` si conviene) según spec §2 Registro: campos, regla de contraseña visible, errores, loading, link a `/login`; al éxito → `/pt/dashboard`.
- `LoginPage`: agregar "¿No tenés cuenta? Registrate" → `/registro`.
- Rutas: `/registro` pública envuelta en `GuestOnly`.
- Tests: registro exitoso (llama a la API, guarda sesión, redirige), `EMAIL_ALREADY_EXISTS` en el campo email, validación por campo, sin red; `GuestOnly` en `/registro` con sesión; link desde el login; `Select`.

**Commit:** `feat(web): registro del entrenador`

## Task 4: Nuevo alumno con QR

- Instalar `qrcode.react` (exacta, 4.2.0).
- `pages/invitations/NewStudentPage.jsx` + `components/invitations/` (formulario, panel del QR, caja "Qué ve el alumno") según spec §2 Nuevo alumno y el prototipo (`PTGenerarQR`): grilla de 2 columnas (max 960 px; una columna en pantallas angostas), kickers, campos, select de objetivo y nivel con "Sin definir", teléfono con `+54` precargado y validación ≥8 dígitos, envío con `delivery_channel:'both'` sin opcionales vacíos, estado vacío del panel, QR con logo al centro (`QRCodeCanvas` + `imageSettings`), "VÁLIDO 48H" desde `expires_at`, link + Copiar (`navigator.clipboard.writeText`, "¡Copiado!" 2 s), WhatsApp (`whatsapp_share_url` en pestaña nueva, `rel="noopener noreferrer"`), Descargar (`canvas.toDataURL('image/png')`, archivo `invitacion-<nombre>.png`), "Generar otro".
- Ruta `/pt/alumnos/nuevo` (rol trainer) con `handle` de título/subtítulo y el ítem "Alumnos" activo; `TrainerSidebar` `INVITE_PATH` → `/pt/alumnos/nuevo`.
- Tests: envío con el body correcto (both, sin vacíos); QR, link y botones visibles tras generar; copiar llama al clipboard; `STUDENT_EMAIL_EXISTS` en el campo email; teléfono inválido; estado vacío inicial; el CTA del sidebar navega a la ruta.

**Commit:** `feat(web): invitar alumno con QR y WhatsApp`

## Task 5: Alta del alumno desde la web (`/join`)

- `pages/students/JoinPage.jsx` (+ componentes si hace falta) según spec §2 Alta del alumno: token de la query (UUID), carga con skeleton, datos precargados de solo lectura, contraseña + confirmación (≥8, coinciden), envío, redirect a `/alumno/hoy`, estados de error (no válido, 404, 410 vencida/usada con "Pedile una nueva a tu profe", red con Reintentar).
- Ruta `/join` pública envuelta en `GuestOnly`.
- Tests: token inválido; precarga OK; alta exitosa → `/alumno/hoy` con sesión de alumno; contraseñas que no coinciden; 410 vencida y usada; 404; con sesión redirige.

**Commit:** `feat(web): alta del alumno desde el link de invitación`
