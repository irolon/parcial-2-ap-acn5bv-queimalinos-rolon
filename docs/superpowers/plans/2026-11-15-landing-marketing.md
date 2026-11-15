# Landing de marketing — plan

Spec: `docs/superpowers/specs/2026-11-15-landing-marketing-design.md`.

1. Copiar el zip a `landing/` (sin `package-lock.json`, `public/_redirects` ni `node_modules`).
2. `package.json`: versiones de `frontend/`, scripts `dev`, `build`, `preview`, `lint`, `test`;
   `@fontsource/*` en lugar de Google Fonts (`index.html` y `main.jsx`).
3. `vite.config.js`: puerto 5174 con `strictPort`, config de Vitest (jsdom, setup, `tests/**`).
4. `react-router-dom` → `react-router` en todo `src/`.
5. `src/data/site.js`: defaults `http://localhost:5173/registro` y `/login`; `.env.example`; `.gitignore` con `.env`.
6. `eslint.config.js` igual al de `frontend/` (`max-lines` 200).
7. Tests (`tests/` con el árbol de `src/`):
   - `tests/App.test.jsx`: cada ruta muestra su `h1`, ruta desconocida → Inicio, `document.title` por página.
   - `tests/components/layout/Navbar.test.jsx`: links de navegación y CTAs con las URLs configuradas.
   - `tests/data/site.test.js`: defaults y override por env.
   - Stub de `IntersectionObserver` y `matchMedia` en el setup (jsdom no los trae).
8. `npm install`, `npm run lint`, `npm test`, `npm run build`; prueba a mano con `frontend/` en 5173.
9. Docs: sección "Landing" en `README.md` raíz, árbol en `CONTRIBUTING.md`, `landing/README.md` actualizado.
10. Tarjeta en el tablero de Igna → 🔍 AUDITORÍA CODEX hasta el ✅.
