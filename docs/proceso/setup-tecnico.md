---
title: README Técnico — Guía de Setup y Desarrollo
aliases: [README Técnico — Guía de Setup y Desarrollo]
notion: https://app.notion.com/p/33c5ffbef7b5818285b1cab269d991ba
notion_editado: 2026-06-20
migrado: 2026-10-17
tags: [proceso]
---

# README Técnico — Guía de Setup y Desarrollo

Guía completa para levantar el proyecto FitTrainer desde cero, tanto en local como en producción. Cualquier integrante del equipo debería poder tener el entorno corriendo en menos de 30 minutos siguiendo esta guía.

> **Stack:** Node.js + Express · React + Vite · Kotlin + Jetpack Compose (Android nativo) · Supabase · Docker · n8n

---

## 1. Prerrequisitos

Instalá todo esto antes de arrancar. Verificá las versiones mínimas.

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 20.x LTS | `node -v` |
| npm | 10.x | `npm -v` |
| Docker Desktop | 24.x | `docker -v` |
| Git | 2.x | `git -v` |
| JDK | 17+ | `java -version` |
| Android Studio | Hedgehog+ | Para emulador Android |

**Cuentas necesarias:**

- Cuenta en [Supabase](https://supabase.com) (plan free es suficiente)
- Android Studio con un emulador (AVD) o un dispositivo físico para pruebas
- Acceso al repositorio en GitHub

---

## 2. Estructura del repositorio

```javascript
fittrainer/
├── backend/                  # Node.js + Express
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── students/
│   │   │   ├── exercises/
│   │   │   ├── routines/
│   │   │   ├── sessions/
│   │   │   ├── progress/
│   │   │   ├── agenda/
│   │   │   └── notifications/
│   │   ├── shared/
│   │   │   ├── middlewares/
│   │   │   │   ├── auth.middleware.js
│   │   │   │   ├── role.middleware.js
│   │   │   │   └── validation.middleware.js
│   │   │   ├── utils/
│   │   │   └── supabase.js
│   │   └── app.js
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/                 # React + Vite (dashboard del PT)
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── store/
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── mobile/                   # Android nativo — Kotlin + Jetpack Compose (alumno y PT)
│   ├── app/src/main/java/com/fittrainer/
│   │   ├── data/             # repositorios + Retrofit/Supabase-kt + Room (cache offline)
│   │   ├── ui/               # pantallas Compose por feature
│   │   ├── navigation/       # Navigation Compose
│   │   └── di/               # inyección de dependencias (Hilt)
│   ├── build.gradle.kts
│   └── local.properties.example
├── docker-compose.yml        # Entorno local completo
├── docker-compose.prod.yml   # Producción
└── README.md
```

---

## 3. Variables de entorno

### 3.1 Backend (`backend/.env`)

```bash
# ── Servidor ────────────────────────────────
PORT=3001
NODE_ENV=development

# ── Supabase ────────────────────────────────
# Encontrás estos valores en: Supabase Dashboard → Settings → API
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── JWT ─────────────────────────────────────
# El JWT_SECRET lo usás para firmar tokens propios (si no usás solo Supabase Auth)
JWT_SECRET=un-secreto-largo-y-aleatorio-minimo-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# ── n8n (chat IA) ───────────────────────────
N8N_WEBHOOK_URL=https://tu-n8n.dominio.com/webhook/fittrainer-chat
N8N_WEBHOOK_SECRET=secreto-compartido-con-n8n

# ── Push notifications ──────────────────────
# Firebase Cloud Messaging (notificaciones push a la app Android)
FCM_SERVER_KEY=tu_fcm_server_key

# ── CORS ────────────────────────────────────
FRONTEND_URL=http://localhost:5173
```

### 3.2 Frontend (`frontend/.env`)

```bash
# Todas las variables de Vite deben empezar con VITE_
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.3 Mobile (`mobile/local.properties`)

```bash
# Se exponen a la app vía BuildConfig en build.gradle.kts
API_URL=http://10.0.2.2:3001/api
# 10.0.2.2 es el alias del host desde el emulador Android (equivale a localhost)
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Nunca commitees archivos `.env` al repositorio.** Solo commitear `.env.example` con los nombres de las variables sin valores reales.

---

## 4. Setup inicial (primera vez)

### Paso 1 — Clonar el repo

```bash
git clone https://github.com/tu-usuario/fittrainer.git
cd fittrainer
```

### Paso 2 — Crear el proyecto en Supabase

1. Ir a [supabase.com](http://supabase.com) → New project
2. Nombre: `fittrainer-dev` · Región: South America (São Paulo)
3. Guardar la contraseña de la DB en algún lugar seguro
4. Una vez creado, ir a **Settings → API** y copiar:
    - `Project URL` → `SUPABASE_URL`
    - `anon public` key → `SUPABASE_ANON_KEY`
    - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Paso 3 — Ejecutar el schema SQL

1. En el dashboard de Supabase ir a **SQL Editor**
2. Copiar y ejecutar el contenido del archivo `backend/src/database/schema.sql` (ver página [[arquitectura/modelo-de-datos|🗄️ Modelo de datos (DER)]])
3. Verificar que las 12 tablas se crearon correctamente en **Table Editor**

### Paso 4 — Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Editar con los valores reales de Supabase

# Frontend
cp frontend/.env.example frontend/.env

# Mobile
cp mobile/local.properties.example mobile/local.properties
# Cambiar API_URL (usá 10.0.2.2 para el emulador Android)
```

### Paso 5 — Instalar dependencias

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Mobile — abrir la carpeta mobile/ en Android Studio
# y sincronizar Gradle (descarga las dependencias automáticamente)
```

---

## 5. Levantar el entorno de desarrollo

### Opción A — Con Docker (recomendado)

Un solo comando levanta backend + base de datos local:

```bash
# Desde la raíz del proyecto
docker-compose up --build
```

Servicios que levanta:

- Backend API → `http://localhost:3001`
- Supabase local (opcional, si usás supabase CLI) → `http://localhost:54321`

### Opción B — Sin Docker (más rápido para desarrollo)

Abrir 3 terminales:

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
# Corre con nodemon, se reinicia automáticamente al guardar
# API disponible en http://localhost:3001
```

**Terminal 2 — Frontend web:**

```bash
cd frontend
npm run dev
# Dashboard del PT disponible en http://localhost:5173
```

**Mobile (Android Studio):**

```bash
# Abrir la carpeta mobile/ en Android Studio, elegir un emulador
# o dispositivo y presionar Run (▶). Por línea de comandos:
cd mobile
./gradlew installDebug
```

### Verificar que todo funciona

Antes de arrancar a desarrollar, verificar estos endpoints:

```bash
# Health check del backend
curl http://localhost:3001/health
# Respuesta esperada: {"status": "ok", "timestamp": "..."}

# Verificar conexión con Supabase
curl http://localhost:3001/health/db
# Respuesta esperada: {"db": "connected"}
```

---

## 6. Scripts disponibles

### Backend

| Script | Comando | Descripción |
|---|---|---|
| Desarrollo | `npm run dev` | Nodemon + hot reload |
| Producción | `npm start` | Node.js directo |
| Tests | `npm test` | Jest |
| Tests watch | `npm run test:watch` | Jest en modo watch |
| Tests coverage | `npm run test:coverage` | Reporte de cobertura |
| Lint | `npm run lint` | ESLint |
| Lint fix | `npm run lint:fix` | ESLint con autofix |

### Frontend

| Script | Comando | Descripción |
|---|---|---|
| Desarrollo | `npm run dev` | Vite dev server |
| Build | `npm run build` | Build de producción |
| Preview | `npm run preview` | Preview del build |
| Lint | `npm run lint` | ESLint |

### Mobile

| Script | Comando | Descripción |
|---|---|---|
| Compilar e instalar | `./gradlew installDebug` | Build + deploy al emulador/dispositivo |
| Tests | `./gradlew test` | Unit tests (JUnit) |
| Build APK (debug) | `./gradlew assembleDebug` | APK para testing |
| Build APK (release) | `./gradlew assembleRelease` | APK de producción |

---

## 7. Flujo de trabajo con Git

### Branches

```javascript
main          → producción, solo merges desde develop
develop       → integración, base para features
feature/xxx   → una feature nueva (ej: feature/auth-qr)
fix/xxx       → corrección de bug (ej: fix/timer-crash)
```

### Convención de commits (Conventional Commits)

```bash
feat: agrega pantalla de sesión activa
fix: corrige timer que no se detiene al finalizar serie
docs: actualiza README con instrucciones de Android Studio
refactor: extrae lógica de progreso a service separado
test: agrega tests de integración para POST /sessions
chore: actualiza dependencias de seguridad
```

### Flujo típico

```bash
# 1. Crear branch desde develop
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-la-feature

# 2. Desarrollar y commitear
git add .
git commit -m "feat: descripción del cambio"

# 3. Push y Pull Request
git push origin feature/nombre-de-la-feature
# Crear PR en GitHub hacia develop
# Requiere revisión del otro integrante antes de mergear
```

---

## 8. Testing

### Correr los tests

```bash
cd backend

# Todos los tests
npm test

# Un archivo específico
npm test -- sessions.service.test.js

# Con coverage
npm run test:coverage
```

### Estructura de tests

```javascript
backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.service.js
│   │   └── auth.service.test.js   ← tests al lado del módulo
│   └── sessions/
│       ├── sessions.service.js
│       └── sessions.service.test.js
└── __tests__/
    └── integration/
        ├── auth.integration.test.js
        └── sessions.integration.test.js
```

### Antes de hacer un PR

```bash
# Checklist mínimo:
npm test          # todos los tests pasan
npm run lint      # cero errores de lint
# Probar manualmente el flujo que modificaste
```

---

## 9. Deploy a producción (VPS)

### Requisitos del servidor

- Ubuntu 22.04 LTS
- 2 vCPU · 4 GB RAM mínimo
- Docker + Docker Compose instalados
- Dominio apuntando al VPS (A record)

### Primer deploy

```bash
# En el servidor
git clone https://github.com/tu-usuario/fittrainer.git
cd fittrainer

# Configurar variables de entorno de producción
cp backend/.env.example backend/.env
# Editar con los valores reales

# Levantar con Docker Compose de producción
docker-compose -f docker-compose.prod.yml up -d --build

# Verificar que los contenedores están corriendo
docker-compose -f docker-compose.prod.yml ps
```

### Actualizar en producción

```bash
# El GitHub Actions lo hace automáticamente al mergear a main
# Para deploy manual:
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

### Ver logs en producción

```bash
# Todos los logs
docker-compose -f docker-compose.prod.yml logs -f

# Solo el backend
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## 10. Solución de problemas frecuentes

> [!note]- ❌ El emulador Android no se conecta a la API
> El emulador no puede usar `localhost` para conectarse al host. Usá tu IP local:
>
> ```bash
> # Ver tu IP local
> ipconfig  # Windows
> ifconfig  # Mac/Linux
>
> # Actualizar mobile/local.properties
> API_URL=http://10.0.2.2:3001/api
> ```

> [!note]- ❌ Error "Invalid JWT" en el backend
> Verificar que `SUPABASE_SERVICE_ROLE_KEY` en el `.env` del backend sea el correcto. Es el key de `service_role`, no el `anon`.

> [!note]- ❌ La cámara (escaneo de QR) no funciona en el emulador
> ```bash
> cd mobile
> ./gradlew --refresh-dependencies
> # Verificá el permiso CAMERA en AndroidManifest.xml y la cámara virtual del AVD (Settings → Camera → Webcam0)
> ```

> [!note]- ❌ Docker: puerto 3001 ya en uso
> ```bash
> # Ver qué proceso usa el puerto
> lsof -i :3001        # Mac/Linux
> netstat -ano | findstr :3001  # Windows
>
> # Matar el proceso o cambiar el puerto en .env
> ```

> [!note]- ❌ Supabase RLS bloquea queries que deberían funcionar
> Durante desarrollo podés deshabilitar RLS temporalmente en una tabla:
>
> ```sql
> -- En el SQL Editor de Supabase (solo en proyecto de dev)
> ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;
> -- Acordate de re-habilitarla antes de mergear
> ```

---

## 11. Contacto del equipo

| Integrante | Rol principal | GitHub |
|---|---|---|
| Ignacio Rolon | Backend + Frontend web | @ignaciorolon |
| Pablo Queimaliños | Mobile (Kotlin / Jetpack Compose) | @pqueimalinos |

---

> **Última actualización:** Junio 2026 · FitTrainer — Proyecto Final de Analista de Sistemas
