# FitTrainer — Landing pública

Sitio de marketing de FitTrainer (lo que se ve sin sesión iniciada). Diseñado en Claude Design.
React 19 + Vite 8 + Tailwind CSS v4 + React Router 7 (las mismas versiones que `frontend/`).

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5174
npm run lint       # ESLint, incluye el tope de 200 líneas por archivo
npm test           # Vitest
npm run build      # genera dist/
npm run preview    # sirve dist/ en el 5174
```

El puerto es el **5174** porque la web de la app (`frontend/`) usa el 5173.

## Variables de entorno

Opcional: copiá `.env.example` a `.env`.

```
VITE_APP_SIGNUP_URL=http://localhost:5173/registro
VITE_APP_LOGIN_URL=http://localhost:5173/login
```

Son los destinos de "Empezá gratis" y "Ya tengo cuenta". Sin `.env` se usan esos mismos valores, así
que con la web corriendo en el 5173 los botones ya llevan al registro y al login del entrenador.

## Páginas (rutas)

| Ruta            | Página                 | Archivo                          |
|-----------------|------------------------|----------------------------------|
| `/`             | Inicio                 | `src/pages/home/Home.jsx`        |
| `/entrenadores` | Para entrenadores      | `src/pages/trainer/Trainers.jsx` |
| `/alumnos`      | Para alumnos           | `src/pages/student/Students.jsx` |
| `/ia`           | Asistentes con IA      | `src/pages/ai/AI.jsx`            |
| `/por-que`      | Por qué FitTrainer     | `src/pages/why/Why.jsx`          |
| `/planes`       | Planes y preguntas     | `src/pages/plans/Plans.jsx`      |

Cualquier otra ruta muestra Inicio.

## Estructura

```
src/
  main.jsx, App.jsx      entrada y rutas
  styles/                index.css (tokens @theme de Tailwind v4 + animaciones), fonts.css (@fontsource)
  components/
    layout/              Navbar, Footer, Logo, Layout (scroll al tope + título por página)
    ui/                  Button, Card, Icon, IconTile, Reveal, SectionHeader, PageHeader, NextPage, FeatureCard, Eyebrow
    mockups/             marcos de celular y navegador, panel del PT, sesión activa, QR
  pages/<página>/        una página por ruta
  sections/<página>/     un componente por sección
  data/<página>/         textos y datos de ejemplo (features, FAQ, planes, series del gráfico)
  data/shared/           URLs de la app, links del menú, formato de números
  hooks/motion/          useInView, useCountUp, useCountdown, useReducedMotion
tests/                   mismo árbol que src/ (helpers en tests/helpers/shared/)
```

Los imports usan el alias `@/` → `src/`.

## Tokens (src/styles/index.css)

Los colores, tipografías y radios de la app están definidos en `@theme`, así que se usan como clases:

- Fondos: `bg-bg-0`, `bg-bg-1`, `bg-bg-2` · superficies: `bg-surface-1`, `bg-surface-2` · `text-muted`
- Texto claro: `text-bone`, `text-bone-2`, `text-bone-3`
- Marca: `bg-brand`, `hover:bg-brand-hover`, `text-brand-text`
- Semánticos: `intensity` (naranja), `info` (celeste), `success` (verde), `warning` (amarillo)
- Tipos: `font-display` (Space Grotesk), `font-sans` (Inter), `font-mono` (JetBrains Mono), servidas
  localmente con `@fontsource` (funciona sin internet)
- Radios: `rounded-pill`, `rounded-card` (18), `rounded-panel` (14), `rounded-field` (12), `rounded-chip` (10), `rounded-tag` (8)

## Animaciones

- Aparición al scroll: `<Reveal>` (usa IntersectionObserver).
- Números que cuentan: `useCountUp` (página Alumnos).
- Gráfico que se dibuja: clase `draw-line` (página Entrenadores).
- Timer de descanso del hero: `useCountdown`.
- Mapa muscular: recorre ejercicios solo hasta que el usuario toca uno. Usa el mismo dibujo del cuerpo
  que la app Android (vista de frente de `mobile/app/src/main/assets/body_map/body_map.json`, de
  react-native-body-highlighter, MIT): `src/data/student/body-map/`. Qué partes pinta cada grupo:
  `src/data/student/bodyParts.js`.
- Todo respeta `prefers-reduced-motion`.

## Pendientes

- Precios sin definir: los placeholders en amarillo de `src/data/plans/plans.js` (`[2–3]`, `[Precio en pesos]`,
  `[límite a definir]`, `[Otros beneficios del plan Pro]`) quedan a propósito hasta que se definan.
- Términos y Privacidad (`Footer.jsx`): no hay páginas todavía; esos links caen en Inicio.
- Los nombres y números de los mockups (Lucía, 18 alumnos, 112,5 kg, etc.) son de ejemplo.
- Corre solo en local: no hay deploy.
