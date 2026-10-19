# Plan — Esqueleto de la web

- **Spec:** `docs/superpowers/specs/2026-10-18-web-skeleton-design.md` (autoridad; ante conflicto, manda el spec).
- **Rama:** `feature/web-skeleton`. Todo el código va en `frontend/`.
- **Diseño:** en esta rama no está `docs/design/` (vive en la PR #18). Leerlo con `git show origin/docs/design-prototypes:docs/design/prototype-src/<archivo>.jsx` (`tokens.jsx`, `ui.jsx`, `alumno-web.jsx`, `pt-dashboard.jsx`).

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código (`.js`, `.jsx`, tests incluidos) pasa de 200 líneas físicas; capa → módulo → archivo; módulos con nombre de recurso en inglés; nada suelto en la raíz de `src/` salvo `main.jsx` y `App.jsx`; tests en `frontend/tests/` espejando `src/`; helpers en `tests/helpers/<módulo>/`; ninguna carpeta con más de 10 archivos.
- JavaScript (sin TypeScript). Versiones **exactas** (sin `^` ni `~`) en `package.json`; commitear `package-lock.json`. Node local 22.14.
- Paquetes: vite 8, react/react-dom 19, react-router 7 (la 7.x más nueva), @tanstack/react-query 5, zustand 5, tailwindcss 4 + @tailwindcss/vite 4, @vitejs/plugin-react, lucide-react, @fontsource/space-grotesk, @fontsource/inter, @fontsource/jetbrains-mono; dev: vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, eslint (+ plugins de react/react-hooks que correspondan).
- Textos de la UI en español rioplatense. Tema oscuro únicamente.
- Commits Conventional Commits en español con scope `web`. **Sin firma de asistentes** (sin `Co-Authored-By`, sin "Generated with"). No pushear. No tocar `backend/` ni `docker-compose.yml`.
- Scripts de `frontend/package.json`: `dev` (Vite en 5173), `build`, `preview`, `lint` (ESLint sobre `src/` y `tests/`, extensiones .js/.jsx, `max-lines` 200 sin saltear blancos ni comentarios), `test` (vitest run).

## Task 1: Proyecto base, tokens y tooling

- Crear el proyecto Vite + React en `frontend/` (sin plantilla de ejemplo: borrar lo que no se use).
- `vite.config.js`: plugin react, plugin tailwind, alias `@` → `src`, `server.port` 5173 y `strictPort: true`. Config de Vitest (jsdom, `setupFiles` con jest-dom).
- `src/styles/`: `tokens.css` con `@theme` (los nombres y valores exactos del spec §2 Diseño, sacados de `tokens.jsx`: ink0–ink6, bone0–bone3, accent, accentDim, accentText `#5E7DE2`, hot, cool, good, warn; fuentes display/body/mono; radios), `fonts.css` (imports de @fontsource con los pesos usados: Space Grotesk 500/600/700, Inter 400/500/600, JetBrains Mono 400/500), `base.css` (fondo ink0, texto bone0, fuente body).
- `components.json` de shadcn apuntando a `src/components/shared/ui` y alias `@/`, sin instalar componentes.
- `eslint.config.js` con la regla `max-lines` exacta de CONTRIBUTING.
- `.env.example` (ya existe: conservar `VITE_API_URL` y `VITE_APP_NAME`; sacar el comentario que dice que el backend se levanta con docker).
- `main.jsx` + `App.jsx` mínimos que rendericen "FitTrainer" con la fuente display.
- Un test humo (`tests/App.test.jsx`) que renderiza App.
- Verificar: `npm run lint`, `npm test`, `npm run build`.

**Commit:** `feat(web): proyecto base con Vite, Tailwind 4 y tokens del prototipo`

## Task 2: Componentes de marca y estados de UI

- `src/components/shared/ui/`: `Button`, `Pill`, `Card`, `Avatar`, `Stat`, `Input` según el spec §2 Diseño y `ui.jsx` (tamaños, variantes, tonos, radios y tipografías exactos del prototipo). `Button` suma hover, focus-visible, disabled y loading (spinner + `aria-busy`). `Input` con `label`, `error` y `id` asociados (accesible).
- `src/components/shared/states/`: `LoadingState` (skeleton), `ErrorState` (mensaje + botón "Reintentar" que llama `onRetry`), `EmptyState` (ícono lucide, título, texto), `QueryState` (recibe `query` de React Query; `isPending` → Loading, `isError` → Error con `refetch`, datos vacíos → Empty, si no `children(data)`).
- Tests en `tests/components/shared/ui/` y `tests/components/shared/states/`: variantes/estados de Button, Input muestra error asociado, QueryState elige bien en los 4 casos.

**Commit:** `feat(web): componentes de marca y estados de UI`

## Task 3: Cliente de API, auth y sesión

- `src/api/shared/client.js`: según spec §2 Sesión y API (base `import.meta.env.VITE_API_URL`; JSON; `Authorization: Bearer` desde el store; errores normalizados `{ status, code, message, details }`; error de red → `{ status: 0, code: 'NETWORK_ERROR', message: 'No hay conexión con el servidor' }`; 401 `UNAUTHORIZED` → un solo refresh compartido y reintento; refresh fallido → `logout()` del store).
- `src/api/auth/auth.api.js`: `login({ email, password })`, `refresh(refreshToken)`, `logout(refreshToken)` contra `/auth/login`, `/auth/refresh`, `/auth/logout` (las rutas de auth no deben disparar el refresh automático en bucle).
- `src/hooks/auth/useAuthStore.js` (Zustand): estado y acciones del spec; persiste solo `user` y `refreshToken` en `localStorage` (clave `fittrainer.session`); el `token` nunca se persiste. `restore()`: si hay refresh guardado → pide access; si falla → `anonymous` y limpia.
- Tests: client (header, normalización de errores, red caída, 401 → un refresh para dos llamadas simultáneas y reintento, refresh fallido → logout), store (login guarda, logout limpia aunque la API falle, restore ok/falla, token no se persiste). Mockear `fetch`.

**Commit:** `feat(web): cliente de API con renovación de sesión y store de auth`

## Task 4: Rutas, guard, login, layouts y placeholders

- `src/routes/`: definición de rutas del spec §2 Rutas (tabla), guard por sesión y rol, redirección de `/` y `/login` según rol, ruta pedida recordada, 404.
- `src/pages/auth/LoginPage.jsx` según spec (mensajes de error exactos; botón loading; redirige al home del rol o a la ruta recordada).
- `src/pages/trainer/*` y `src/pages/student/*`: un placeholder por ítem con título y `EmptyState` "Próximamente" (si son muchos archivos iguales, un componente `PlaceholderPage` en `pages/shared/` parametrizado + tabla de rutas, para no repetir código ni pasar de 10 archivos por carpeta). `pages/shared/NotFoundPage.jsx`.
- `src/components/shared/layout/`: `AppShell`, `TrainerSidebar`, `StudentSidebar`, `Topbar` copiando `alumno-web.jsx`/`pt-dashboard.jsx` (logo cuadrado accent 28 px con ícono bolt, subtítulos "PRO · <nombre>" / "ALUMNO · <nombre>", ítems y orden exactos, activo con fondo ink3, tarjeta INVITAR + "Generar QR" del entrenador, búsqueda visual ⌘K y campana del entrenador, bloque de usuario con **Cerrar sesión**). Responsive del spec (≥1024 completo 220 px; 768–1023 íconos 64 px con tooltip; <768 drawer con botón de menú, Escape y clic afuera lo cierran, foco accesible).
- `App.jsx` monta QueryClientProvider + Router y llama `restore()` al iniciar.
- Tests: guard (sin sesión → /login; otro rol → su home; su rol → pasa; loading → skeleton), LoginPage (error de credenciales), layout (escritorio muestra sidebar; mobile muestra botón de menú — simular ancho con `matchMedia` mockeado o clases y `window.innerWidth`).
- Verificar `npm run lint`, `npm test`, `npm run build`.

**Commit:** `feat(web): rutas por rol, login y layouts responsive`
