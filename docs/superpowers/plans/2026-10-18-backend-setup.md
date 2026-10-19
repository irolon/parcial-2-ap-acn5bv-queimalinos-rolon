# Plan — Backend corriendo en tu máquina + guía de setup

- **Spec:** `docs/superpowers/specs/2026-10-18-backend-setup-design.md` (autoridad).
- **Rama:** `docs/backend-setup`.

## Global Constraints

- Español rioplatense, tono de los docs existentes: frases cortas, listas, bloques de comandos copiables.
- **Nunca** escribir claves, contraseñas ni el contenido de `backend/.env` en ningún archivo. Los usuarios de prueba van sin contraseña.
- Todo comando se escribe para Windows con Git Bash o PowerShell y también funciona en macOS/Linux; donde difieran, mostrar las dos variantes.
- No tocar código del backend, `docker-compose*.yml` ni `Dockerfile`.
- Commits en Conventional Commits en español, **sin firma de asistentes**. No pushear.
- Las notas de `docs/` son un vault de Obsidian: conservar el frontmatter y usar links `[[…]]` entre notas como hacen las demás.

## Task 1: Guía de setup y correcciones

1. `docs/proceso/setup-tecnico.md`: reescribirla entera según el spec §2 (prerrequisitos con Node 22 LTS / mínimo 20.19, Git, cuenta de Supabase; clonar; claves del proyecto compartido por privado; `backend/.env` variable por variable, marcando las obligatorias de `backend/src/config/env.js` y cómo generar `JWT_SECRET`; `npm install` + `npm run dev`; verificación (`/health`, `/health/db`, login con `curl`, `npm test`, `npm run lint`); base nueva desde cero; usuarios de prueba y cómo crearlos con `curl`; conectar la web (#19: `frontend/`, `npm install`, `.env` desde `.env.example`, `npm run dev` en 5173, `FRONTEND_URL`); conectar el mobile (`10.0.2.2`, `adb reverse`); Docker opcional (lo mantiene Igna, S7); problemas frecuentes). Actualizar el frontmatter (fecha) y sacar todo lo desactualizado listado en el spec. Verificar cada dato contra el código (rutas, variables, respuestas de `/health`).
2. `README.md` raíz: "Arranque rápido" nativo autosuficiente para el backend (Node 22, `.env` con las claves que te pasa el equipo, `npm install`, `npm run dev`, `curl` a `/health` y `/health/db`), link a la guía completa; Docker como opcional; la documentación vive en `docs/` (no Notion); link al tablero de equipo `https://trello.com/b/yBj0xE8S`; sacar "frontend pendiente" (describir `frontend/` brevemente).
3. `backend/README.md`: la sección Setup pasa a ser un link a la guía (sin duplicar pasos); tabla de scripts completa (`test:watch`, `lint:fix`, `format`, `db:check-anon`); sacar la nota duplicada del `select name, count(*)…` si queda redundante con la guía.
4. `.nvmrc` en la raíz con `22`.
5. `mobile/.env.example`: cambiar "El puerto es el mismo que publica docker-compose.yml: 3001" por una frase sin Docker (el backend escucha en el 3001).
6. `docs/arquitectura/modelo-de-datos.md`: la referencia a `backend/src/database/schema.sql` pasa a `backend/src/database/schema/` (01 a 07).

**Commit:** `docs: guía de setup del backend y arranque rápido nativo`
