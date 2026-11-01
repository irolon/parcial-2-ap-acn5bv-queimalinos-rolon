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

## Estado

Lo que ya está en `develop`. El detalle de cada tarjeta (spec, plan y docs que toca) está en [`docs/tarjetas.md`](docs/tarjetas.md).

**Backend** (detalle de endpoints en [`backend/README.md`](backend/README.md))
- [x] **Auth:** register, login (trainer y alumno), refresh, logout + middleware JWT/rol.
- [x] **Onboarding:** invitaciones (QR / WhatsApp) + alta de alumno desde la invitación.
- [x] **Alumnos:** listado del PT, ficha, edición/baja y medidas corporales con IMC.
- [x] **Ejercicios:** biblioteca CRUD con ownership + seed de 50 globales.
- [x] **Rutinas y plantillas:** crear/asignar, editar, rutina del día; plantillas reutilizables que se copian al asignarlas.
- [x] **Sesiones:** inicio, lote de series idempotente (offline-first) y cierre.
- [x] **Historial de sesiones** con comentarios del PT.
- [x] **Gamificación:** logros, rachas y desafíos.
- [x] **Progreso:** curva de carga por ejercicio (1RM estimado, peso máximo y volumen) y evolución corporal.
- [x] **Notificaciones:** tabla como fuente de verdad, push FCM (HTTP v1), alerta de inactividad del PT y avisos de récords, rutina modificada y logros.

**Web** (React)
- [x] Login y alta por invitación, dashboard y panel de alumnos con ficha, biblioteca de ejercicios, editor de rutinas con plantillas, historial de sesiones con comentarios del PT, vista de progreso con gráficos (Recharts), y racha, logros y desafíos del PT (crear, asignar y seguir el progreso).
- [x] **Portal del alumno:** Hoy con la rutina del día, sesión activa simplificada (se guarda en el navegador y se sube al terminar), Mis rutinas, Historial, Mi progreso con logros y Mi perfil con medidas. Offline y reemplazar ejercicio están solo en el celular; push y pedir turno están pendientes.

**Mobile** (Android)
- [x] Login, alta por QR, rutina del día offline, biblioteca, sesión activa con timer, avisos de fin de descanso y **sincronización offline** de sesiones con WorkManager.
- [x] **Historial de sesiones** offline (con los comentarios del entrenador) y **feedback post-entreno** (RPE y nota).
- [x] **Mis rutinas:** todas las rutinas asignadas con su detalle, offline, y se puede entrenar una rutina que no es la del día (la biblioteca pasa a ser una entrada dentro de Mis rutinas).

**En revisión (PRs abiertas):** logros, racha y desafíos del PT en la web (#42).

**Pendiente:** IA (asistente del alumno y del PT, con n8n), agenda, mensajería, QA y deploy (S7).

> DB en Supabase (proyecto **Fit-Trainer**): las migraciones de cada tarjeta están en `backend/src/database/migrations/` y se aplican a mano en la base compartida.

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

### Web

Con el backend levantado:

```bash
cp frontend/.env.example frontend/.env   # VITE_API_URL=http://localhost:3001/api
cd frontend
npm install
npm run dev                              # web en http://localhost:5173
```

`npm run lint` y `npm test` (Vitest) antes de cada PR, igual que en el backend.

### Mobile

Abrí `mobile/` en Android Studio y copiá `mobile/.env.example` a `mobile/.env`.

> El emulador de Android **no** llega a la API por `localhost` —
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
