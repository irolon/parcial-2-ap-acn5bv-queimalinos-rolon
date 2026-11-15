# Landing de marketing — diseño

Fecha: 15/11/2026 · Dueño: Igna · Pablo está al tanto.

## Para qué

La web pública de FitTrainer (lo que se ve sin sesión). Dos trabajos:

1. Que un entrenador que llega termine registrándose (`/registro` de la web de la app).
2. Mostrarla en la entrega del 04/12/2026.

Corre **solo en local**: no hay VPS ni dominio publicados todavía.

## Punto de partida

Igna la diseñó en Claude Design; el resultado es un proyecto Vite + React + Tailwind v4 + React Router
(`fittrainer-landing.zip`, 6 páginas: `/`, `/entrenadores`, `/alumnos`, `/ia`, `/por-que`, `/planes`).
**El diseño y los textos se traen tal cual** (decisión de Igna): no se rediseña nada.

## Decisiones de Igna

- Carpeta propia en la raíz del monorepo: `landing/`. No va dentro de `frontend/` (que es de Pablo).
- Los precios no están definidos: quedan los placeholders en amarillo de `src/data/plans.js` como están.
- Contenido sin cambios.

## Decisiones de Claude (revisables)

- **Puerto 5174** fijo (`strictPort`): la web de la app ya usa 5173.
- **CTAs:** "Empezá gratis" → `http://localhost:5173/registro`, "Ya tengo cuenta" → `http://localhost:5173/login`.
  Configurables por `VITE_APP_SIGNUP_URL` / `VITE_APP_LOGIN_URL` (`landing/.env.example`); esos son los
  valores por defecto. (El zip traía `/registro` relativo, que en un sitio aparte cae en la propia landing.)
- **Mismas versiones que `frontend/`** (React 19, React Router 7, Vite 8, Tailwind 4.3): un solo juego de
  versiones en el monorepo. El cambio de código es mínimo (`react-router-dom` → `react-router`).
- **Fuentes con `@fontsource`** como `frontend/`, en lugar de Google Fonts: funciona sin internet en la demo.
- **Lint y tests como `frontend/`:** ESLint con `max-lines` 200 (error), Vitest + Testing Library con el
  árbol de `tests/` copiando el de `src/`. Tests: cada ruta renderiza su título, las rutas desconocidas
  caen en Inicio, los CTAs apuntan a las URLs configuradas, el `<title>` cambia por página.
- **Términos y Privacidad:** los links del footer quedan como en el diseño; hoy caen en Inicio (ruta `*`).
  Pendiente de contenido, igual que los precios.
- Sin `public/_redirects` (era para Netlify; no hay deploy).

## Fuera de alcance

Deploy, SEO/analytics, formularios propios, páginas legales con texto, precios, cambios en `frontend/`.

## Criterio de aceptación

- `cd landing && npm install && npm run dev` levanta en `http://localhost:5174` las 6 páginas con el diseño del zip.
- Con `frontend/` corriendo, "Empezá gratis" abre el registro y "Ya tengo cuenta" el login de la web.
- `npm run lint`, `npm test` y `npm run build` en verde; ningún archivo de código pasa de 200 líneas.
- `README.md` raíz y `CONTRIBUTING.md` explican cómo correrla y su árbol.
