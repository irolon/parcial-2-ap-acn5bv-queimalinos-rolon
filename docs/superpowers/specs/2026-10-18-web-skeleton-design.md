# Spec — Esqueleto de la web (React + Vite + Tailwind)

- **Tarjeta:** "3 · Esqueleto de la web React + Vite + Tailwind" (tablero personal de Pablo) → tarjeta de equipo https://trello.com/c/W8pCC26w
- **Fecha:** 2026-10-18
- **Rama:** `feature/web-skeleton`, sale de `develop`. PR a `develop`, la revisa Igna.
- **Reglas que aplican:** `CONTRIBUTING.md` (200 líneas por archivo, tests incluidos; capa → módulo → archivo; módulos con el nombre del recurso de la API en inglés).
- **Diseño:** `docs/design/` (PR #18): `prototipo-web.html`, `guia-web.pdf`, `manual-de-marca.pdf` y sobre todo `prototype-src/tokens.jsx`, `ui.jsx`, `alumno-web.jsx` y `pt-dashboard.jsx` (sidebar, topbar y componentes).
- **Backend:** auth real de `develop` (`backend/src/routes/auth/`).

## 1. Objetivo

Dejar la web lista para que agregar una pantalla nueva sea crear un archivo y una ruta. El esqueleto incluye:

- autenticación contra el backend;
- layout por rol y responsive;
- cliente de API único;
- componentes de marca;
- los 4 estados de UI.

**Criterio de aceptación (de la tarjeta):** `npm run dev` levanta en `localhost:5173`. Hay una ruta pública y una protegida, y la protegida redirige al login si no hay token.

## 2. Decisiones tomadas

### Stack (versiones fijas)
- JavaScript (sin TypeScript), con Vite 8, React 19 y React Router 7.
- @tanstack/react-query 5 para el estado de servidor.
- Zustand 5 para la sesión.
- Tailwind CSS 4 con `@tailwindcss/vite`.
- Íconos con `lucide-react`.
- Fuentes autoalojadas con `@fontsource`: Space Grotesk, Inter y JetBrains Mono.
- Tests con Vitest 5, Testing Library y jsdom. ESLint con `max-lines` 200.
- shadcn/ui queda **configurado** (`components.json`, alias `@/`) pero sin componentes instalados. Se suma solo para primitivas accesibles (Dialog, Dropdown, Select, Toast) cuando una pantalla las necesite.
- Todas las versiones se fijan exactas en `package.json` y el lockfile se commitea.

### Diseño
- Los tokens de `prototype-src/tokens.jsx` pasan a variables de Tailwind v4 (`@theme` en `src/styles/`), con los mismos nombres que en el prototipo:
  - escala `ink0` a `ink6`;
  - escala `bone0` a `bone3`;
  - colores `accent`, `accentDim`, `hot`, `cool`, `good` y `warn`;
  - fuentes `display`, `body` y `mono`.
- El azul de texto sobre fondo oscuro (`#5E7DE2`) va como token `accentText`.
- **Tema oscuro únicamente.** Sin sombras. Radios de 99, 18, 14, 12, 10 y 8 px, como en el prototipo.
- Componentes de marca propios en `components/shared/ui/`, que copian `ui.jsx`:
  - `Button`: variantes primary, ghost, dark y danger; tamaños sm 32, md 44 y lg 56. Además se agregan los estados hover, focus visible, disabled y loading, que el prototipo no define.
  - `Pill`: tonos neutral, accent, hot, good, cool y ghost; tamaños sm y md.
  - `Card`, `Avatar`, `Stat` e `Input`. El input mide 46 px, con etiqueta en mono 9 px y foco en `accentText`.
- No se copian el selector de acento ni el de fuente del prototipo: son solo de la demo.

### Sesión y API
- **Tokens:**
  - el access token vive **solo en memoria**, dentro del store;
  - el `refresh_token` y el `user` se guardan en `localStorage`;
  - al cargar la app, si hay un refresh guardado, se pide un access nuevo antes de mostrar las rutas protegidas.
- **Store** `hooks/auth/useAuthStore.js` (Zustand):
  - estado: `user`, `token`, `refreshToken`, `status` (`idle`, `loading`, `authenticated` o `anonymous`);
  - acciones: `login(credentials)`, `logout()` y `restore()`.
- **Cliente** `api/shared/client.js` (único lugar que arma `Authorization`):
  - usa `VITE_API_URL` como base y manda JSON;
  - normaliza los errores a `{ status, code, message, details }`, a partir del formato del backend `{ error: { code, message, details } }`;
  - ante un 401 con `code: UNAUTHORIZED`, renueva **una sola vez** con `POST /auth/refresh`. Las llamadas que fallan al mismo tiempo comparten la misma promesa de renovación. Después reintenta;
  - si la renovación falla, hace logout y redirige a `/login`.
- `expires_in` se ignora: el backend lo manda como `'1h'`, no en segundos.
- Las llamadas de auth van en `api/auth/auth.api.js`: `login`, `refresh` y `logout`.
- El logout es `POST /auth/logout` con el `refresh_token`. Aunque falle, limpia el estado local.
- No existe `GET /auth/me`, así que el `user` sale de la respuesta del login.

### Rutas
- Las URLs van en español; los módulos del código, en inglés.

| Ruta | Acceso | Pantalla |
|---|---|---|
| `/login` | pública | Login |
| `/` | — | redirige según el rol (o a `/login`) |
| `/pt/dashboard`, `/pt/alumnos`, `/pt/rutinas`, `/pt/biblioteca`, `/pt/agenda`, `/pt/mensajes` | `trainer` | placeholder |
| `/alumno/hoy`, `/alumno/progreso`, `/alumno/rutinas`, `/alumno/historial`, `/alumno/asistente`, `/alumno/perfil` | `student` | placeholder |
| cualquier otra | — | 404 con el estado vacío |

- **Guard** en `routes/`:
  - sin sesión, redirige a `/login` y recuerda la ruta pedida;
  - con sesión de otro rol, redirige a la home de su propio rol;
  - mientras `status` es `loading`, muestra el skeleton.
- Con sesión iniciada, `/login` redirige a la home del rol.

### Pantallas del esqueleto
- **Login** (no tiene mockup): se arma con el logo, los tokens y los componentes del manual, centrado.
  - Campos: email y contraseña, con el botón "Ingresar" en estado loading mientras envía.
  - Errores visibles:
    - `INVALID_CREDENTIALS` → "Email o contraseña incorrectos";
    - `ACCOUNT_DISABLED` → mensaje del backend;
    - sin red → "No hay conexión con el servidor";
    - `VALIDATION_ERROR` → el error junto a cada campo.
  - Sin "Registrate" ni "Olvidé mi contraseña": el registro y el alta por QR son de la tarjeta 5.
- **Layouts** en `components/shared/layout/`: `AppShell`, `TrainerSidebar`, `StudentSidebar` y `Topbar`, copiando el prototipo.
  - Sidebar del entrenador:
    - logo, "FitTrainer" y el subtítulo "PRO · <nombre>";
    - ítems Dashboard, Alumnos, Rutinas, Biblioteca, Agenda y Mensajes;
    - al pie, la tarjeta "INVITAR" con el botón "Generar QR" (lleva a `/pt/alumnos` mientras no exista la pantalla).
    - No se muestran badges con números falsos.
  - Sidebar del alumno:
    - logo y el subtítulo "ALUMNO · <nombre>";
    - ítems Hoy, Mi progreso, Mis rutinas, Historial, Asistente IA y Mi perfil.
    - La tarjeta "TU ENTRENADORA" se omite hasta que el backend devuelva el entrenador.
  - Topbar: título y subtítulo de la página. El entrenador tiene además la búsqueda (solo visual, con ⌘K) y la campana.
  - Bloque de usuario con el botón **Cerrar sesión**.
- **Placeholders:** cada ítem del sidebar tiene su página con el título correcto y el estado **vacío** ("Próximamente"). No se adelantan pantallas de otras tarjetas.

### Responsive (prioridad escritorio)
| Ancho | Layout |
|---|---|
| ≥ 1024 px | Sidebar completo de 220 px, como el prototipo |
| 768–1023 px | Sidebar de íconos de 64 px, con el nombre del ítem al pasar el mouse (tooltip) |
| < 768 px | Sin sidebar fijo. Botón de menú en la topbar que abre el sidebar como panel lateral. La búsqueda se reduce a una lupa |

El contenido es fluido y pasa a una columna en pantallas angostas. Las tablas y grillas de cada pantalla se adaptan en su propia tarjeta.

### Estados de UI
En `components/shared/states/`, reutilizables y armados con los tokens, porque el prototipo no los tiene:
- `LoadingState`: skeleton;
- `ErrorState`: mensaje y "Reintentar";
- `EmptyState`: ícono, título y texto;
- `QueryState`: recibe una query de React Query y elige cuál de los tres estados mostrar o renderiza los datos.

## 3. Estructura

```
frontend/
  index.html, vite.config.js, eslint.config.js, components.json, package.json, .env.example
  src/
    main.jsx, App.jsx
    api/shared/client.js          api/auth/auth.api.js
    hooks/auth/useAuthStore.js
    routes/  (router, guard, tabla de rutas por rol)
    pages/auth/LoginPage.jsx      pages/trainer/…  pages/student/…  pages/shared/NotFoundPage.jsx
    components/shared/ui/  layout/  states/
    styles/  (tokens @theme, fuentes, base)
  tests/  (mismo árbol que src; helpers en tests/helpers/<módulo>/)
```

Ninguna carpeta pasa de 10 archivos y ningún archivo de 200 líneas.

## 4. Verificación
- `npm run lint`, que incluye `max-lines` 200, y `npm test` en verde.
- Tests mínimos:
  - el guard: sin sesión redirige a `/login`; con otro rol redirige a su home; con su rol deja pasar;
  - el cliente: agrega `Authorization`; ante un 401 renueva una sola vez y reintenta, aunque lleguen dos 401 al mismo tiempo; si la renovación falla, hace logout;
  - el store: el login guarda `user` y refresh, y el logout limpia;
  - el login: muestra el error de credenciales;
  - los estados: `QueryState` elige el estado correcto;
  - el layout: en escritorio se ve el sidebar y en mobile el botón de menú.
- **Manual en el navegador**, contra el backend real (`npm run dev` en `backend/`):
  - login como entrenador y como alumno, cada uno con su sidebar;
  - cruzar de rol redirige;
  - recargar la página mantiene la sesión;
  - logout;
  - `/pt/dashboard` sin sesión redirige al login;
  - capturas a 1280, 900 y 375 px en la PR.
- El criterio de aceptación de la tarjeta.

## 5. Fuera de alcance
- Registro del entrenador, alta del alumno por QR y pantallas reales: tarjetas 5, 7 en adelante.
- Docker del frontend: lo hace Igna en el S7.
- Cambios de backend. Para el backend quedan anotados: `expires_in` llega como texto, falta `GET /auth/me`, el refresh no rota, y el logout con el access vencido no revoca el refresh en el servidor (el endpoint exige `authenticate`).
- Tema claro y soporte de navegadores viejos.
