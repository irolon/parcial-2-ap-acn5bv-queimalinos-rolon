# Spec — Backend corriendo en tu máquina + guía de setup

- **Tarjeta:** "4 · Backend corriendo en tu máquina + README de setup" (tablero personal de Pablo) → tarjeta de equipo https://trello.com/c/pbm1FYGt
- **Fecha:** 2026-10-18
- **Rama:** `docs/backend-setup`, sale de `develop`. PR a `develop`; la revisa Igna.
- **Fuentes:** las dos tarjetas, la guía del tablero personal (decisión del 12/10: backend nativo hasta el S7), `backend/src/config/env.js`, `backend/README.md`, `backend/src/database/schema/README.md`, `mobile/.env.example`, `frontend/` (PR #19).

## 1. Objetivo

Que cualquiera de los dos levante el backend en una máquina nueva siguiendo un solo documento, sin pasos que adivinar, y sepa cómo conectarle la web y el emulador.

**Criterio de aceptación (de la tarjeta):** "Levantás el backend en tu máquina siguiendo solo el README. Igna levanta la misma versión en la suya y la app del emulador le pega sin tocar nada más que el `.env`."

## 2. Decisiones tomadas

- **Alcance:** el backend completo, más una sección corta de cómo se conectan la web y el mobile:
  - la web corre en `localhost:5173` y usa `VITE_API_URL`;
  - el CORS del backend acepta un solo origen, `FRONTEND_URL`;
  - el emulador llega por `10.0.2.2`, y un celular físico por `adb reverse`.
- **Dónde vive cada cosa** (una sola fuente por tema):
  - `README.md` raíz, "Arranque rápido": alcanza solo para que el backend responda y diga que la base está conectada. Usa el backend nativo.
  - `docs/proceso/setup-tecnico.md`: se reescribe como la guía completa, que es la fuente oficial porque vive en `docs/`. Incluye:
    - prerrequisitos;
    - las claves del proyecto compartido;
    - cómo armar una base nueva;
    - usuarios de prueba;
    - web y mobile;
    - verificación y problemas frecuentes.
  - `backend/README.md`: queda como referencia técnica (arquitectura, endpoints, scripts). Su sección Setup pasa a ser un link a la guía, y la tabla de scripts suma los que faltan.
- **Docker:** primero va el arranque nativo. Docker aparece como opcional, aclarando que lo mantiene Igna y que se retoma en el S7. No se tocan `docker-compose*.yml` ni el `Dockerfile`.
- **Supabase:** los dos usan el proyecto de dev compartido, que ya tiene el schema, el seed y los usuarios de prueba.
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY` se piden por privado. Nunca se commitean.
  - Aparte se documenta cómo armar una base nueva desde cero:
    1. schema `01` a `07`;
    2. `checks/schema-checks.sql`, que tiene que dar 0 filas;
    3. `seeds/exercises.sql`;
    4. `checks/exercises-checks.sql`, que tiene que dar 0 filas;
    5. las migraciones de `migrations/`, solo en bases que ya existían.
- **Usuarios de prueba:** la guía nombra `profe.card8@test.com` y `alumna.card8@test.com` **sin la contraseña**, porque el repo es público: "pedísela al equipo". Para una base nueva, se crean así, con ejemplos de `curl`:
  - el entrenador, con `POST /api/auth/register`;
  - el alumno, con `POST /api/invitations` (como entrenador) y después `POST /api/students` con el token.
- **`JWT_SECRET`:** cómo generarlo (mínimo 32 caracteres): `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- **Node:** se documenta Node 22 LTS (mínimo 20.19) y se agrega `.nvmrc` con `22` en la raíz.
- **Verificación descripta en la guía:**
  - `GET http://localhost:3001/health` → `{ status: 'ok', … }`;
  - `GET /health/db` → `{ db: 'connected', … }`;
  - login con un usuario de prueba (`POST /api/auth/login`);
  - `npm test` y `npm run lint`.
- **Errores frecuentes:**
  - falta una variable: el server dice "❌ Variables de entorno inválidas";
  - `JWT_SECRET` corto;
  - puerto 3001 ocupado;
  - CORS: la web en otro puerto obliga a ajustar `FRONTEND_URL`;
  - el emulador con `localhost`;
  - un celular por wifi no funciona con HTTP: hay que usar `adb reverse`;
  - `/health/db` da 503 cuando las claves están mal.
- **Lo desactualizado que se corrige:**
  - `setup-tecnico.md`: Supabase Auth, `schema.sql`, 12 tablas, `modules/`, la rama `main`, el reparto de roles viejo, Docker como recomendado y variables que no existen.
  - README raíz: Notion como fuente, el link al Trello viejo y "frontend pendiente".
  - `mobile/.env.example`: la referencia a `docker-compose.yml` en el comentario del puerto.
  - `docs/arquitectura/modelo-de-datos.md`: la ruta `schema.sql`.
- **Se anota en la PR sin tocarlo:** los usuarios viejos de `docs/proceso/plan-de-pruebas.md` y el "Documento Control de Versiones". La tarjeta de equipo dice "IP de la LAN desde un celular físico", pero no funciona con HTTP; vale lo que dice `mobile/.env.example`.

## 3. Verificación

- **Pablo:** seguir solo el README en un clon limpio, con Node 22:
  - `npm install`, `.env` con las claves del proyecto compartido, `npm run dev`;
  - `/health` y `/health/db` responden bien;
  - el login de los dos usuarios de prueba devuelve token;
  - `npm test` y `npm run lint` en verde.
- **Igna:** en la PR se le pide que levante esta versión en su máquina y confirme que el emulador le pega cambiando solo el `.env`. La tarjeta queda en AHORA hasta que lo confirme y mergee.

## 4. Fuera de alcance

- Scripts para aplicar el schema o crear usuarios.
- Cambios en Docker, CI o el deploy (S7).
- Cambios de código del backend.
