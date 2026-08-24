# FitTrainer

Plataforma para personal trainers y sus alumnos · **Web + Android** · Proyecto Final de Analista de Sistemas.

Monorepo con tres clientes/servicios:

| Carpeta | Qué es | Stack |
|---------|--------|-------|
| `backend/` | API REST (monolito modular) | Node.js + Express + Supabase/PostgreSQL |
| `frontend/` | Dashboard web (ambos roles) | React + Vite + Tailwind *(pendiente)* |
| `mobile/` | App Android nativa (ambos roles) | Kotlin / JAVA *(pendiente)* |

La documentación completa (arquitectura, contratos de API, modelo de datos, plan de
desarrollo) vive en el tablero de Notion del proyecto.

**🔗 Tablero de seguimiento (Trello / Kanban):** https://trello.com/b/OPDghdCH/fittrainer-parcial-2-administraci%C3%B3n-de-proyectos

## Estado (backend)

- [x] **Fase 1 — Auth:** register, login (trainer y alumno), refresh, logout + middleware JWT/rol.
- [x] **Fase 1 — Onboarding:** invitaciones (QR / WhatsApp) + alta de alumno desde invitación.
- [x] **Fase 2 — Ejercicios:** biblioteca CRUD con ownership + seed de globales.
- [x] **Fase 2 — Rutinas:** crear/asignar, listar, detalle, editar/desactivar, agregar ejercicios, rutina del día.
- [x] **Fase 2 — Alumnos:** listado del PT (`GET /students`).
- [ ] Fase 2 — Plantillas de rutina reutilizables (HU-07).
- [ ] Fase 3 — Sesiones, tracking y progreso.
- [ ] **Frontend web** y **mobile** (todo lo de arriba es backend).

> DB en Supabase (proyecto **Fit-Trainer**): schema + seed aplicados, conexión verificada.

## Arranque rápido — Docker (recomendado)

Único requisito: **Docker Desktop**. No hace falta instalar Node.

```bash
cp backend/.env.example backend/.env   # completar con credenciales de Supabase
docker compose up --build              # API en http://localhost:3001
```

Verificar que levantó:

```bash
curl http://localhost:3001/health
```

El código se monta por volumen: editás un archivo y el server recarga solo, sin
rebuildear. Solo hay que volver a buildear si cambian `package.json` o el
`Dockerfile`.

**¿El puerto 3001 ya está ocupado?** Publicalo en otro sin editar nada:

```bash
API_PORT=3002 docker compose up --build
```

| Archivo | Para qué |
|---------|----------|
| `docker-compose.yml` | Desarrollo: hot reload, código montado |
| `docker-compose.prod.yml` | VPS: sin volúmenes, `NODE_ENV=production`, logs rotados |

> **Mobile:** el emulador de Android **no** llega a la API por `localhost` —
> tiene que ser **`10.0.2.2`**. Está explicado en `mobile/.env.example`.

### Sin Docker

```bash
cd backend
cp .env.example .env
npm install
npm run dev            # API en http://localhost:3001
```

Ver `backend/README.md` para el detalle de la arquitectura y los endpoints.
