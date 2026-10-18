# FitTrainer

> **Antes de escribir código, leé [`CONTRIBUTING.md`](CONTRIBUTING.md).** Ningún archivo de código pasa de 200 líneas y todo va ordenado capa → módulo → archivo. No es negociable.

Plataforma para personal trainers y sus alumnos · **Web + Android** · Proyecto Final de Analista de Sistemas.

Monorepo con tres clientes/servicios:

| Carpeta | Qué es | Stack |
|---------|--------|-------|
| `backend/` | API REST (monolito modular) | Node.js + Express + Supabase/PostgreSQL |
| `frontend/` | Dashboard web (ambos roles) | React + Vite + Tailwind |
| `mobile/` | App Android nativa (ambos roles) | Kotlin / Jetpack Compose |

La documentación completa (arquitectura, contratos de API, modelo de datos, plan de
desarrollo, guía de setup) vive en [`docs/`](docs/inicio.md), que se abre como vault de Obsidian.

**Tablero de seguimiento del equipo (Trello):** https://trello.com/b/yBj0xE8S

## Estado (backend)

- [x] **Fase 1 — Auth:** register, login (trainer y alumno), refresh, logout + middleware JWT/rol.
- [x] **Fase 1 — Onboarding:** invitaciones (QR / WhatsApp) + alta de alumno desde invitación.
- [x] **Fase 2 — Ejercicios:** biblioteca CRUD con ownership + seed de globales.
- [x] **Fase 2 — Rutinas:** crear/asignar, listar, detalle, editar/desactivar, agregar ejercicios, rutina del día.
- [x] **Fase 2 — Alumnos:** listado del PT (`GET /students`).
- [ ] Fase 2 — Plantillas de rutina reutilizables (HU-07).
- [ ] Fase 3 — Sesiones, tracking y progreso.
- [ ] **Frontend web** y **mobile** en desarrollo (todo lo de arriba es backend).

> DB en Supabase (proyecto **Fit-Trainer**): schema + seed aplicados, conexión verificada.

## Arranque rápido (backend)

Necesitás **Node 22** (`node -v`; hay un `.nvmrc`) y las claves del proyecto de Supabase
compartido, que te pasa el equipo por privado.

```bash
cp backend/.env.example backend/.env   # completar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y JWT_SECRET
cd backend
npm install
npm run dev                            # API en http://localhost:3001
```

Verificar que levantó (en otra terminal):

```bash
curl http://localhost:3001/health      # {"status":"ok",...}
curl http://localhost:3001/health/db   # {"db":"connected",...}
```

La guía completa (cómo generar el `JWT_SECRET`, base nueva, usuarios de prueba, conectar
la web y el emulador, problemas frecuentes) está en
[`docs/proceso/setup-tecnico.md`](docs/proceso/setup-tecnico.md).

> **Mobile:** el emulador de Android **no** llega a la API por `localhost` —
> tiene que ser **`10.0.2.2`**. Está explicado en `mobile/.env.example`.

### Docker (opcional)

Alternativa si no querés instalar Node. Lo mantiene Igna y se retoma en el S7.

```bash
docker compose up --build              # API en http://localhost:3001
```

| Archivo | Para qué |
|---------|----------|
| `docker-compose.yml` | Desarrollo: hot reload, código montado |
| `docker-compose.prod.yml` | VPS: sin volúmenes, `NODE_ENV=production`, logs rotados |

Ver `backend/README.md` para el detalle de la arquitectura y los endpoints.
