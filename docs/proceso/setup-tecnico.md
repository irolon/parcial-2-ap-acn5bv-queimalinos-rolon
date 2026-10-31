---
title: README Técnico — Guía de Setup y Desarrollo
aliases: [README Técnico — Guía de Setup y Desarrollo]
notion: https://app.notion.com/p/33c5ffbef7b5818285b1cab269d991ba
notion_editado: 2026-06-20
migrado: 2026-10-17
actualizado: 2026-10-18
tags: [proceso]
---

# README Técnico — Guía de Setup y Desarrollo

Cómo levantar el backend de FitTrainer en tu máquina y conectarle la web y el emulador de Android. Esta guía es la fuente oficial del setup: si algo cambia, se cambia acá.

> **Stack:** Node.js + Express · Supabase (PostgreSQL) · React + Vite · Kotlin + Jetpack Compose

---

## 1. Prerrequisitos

| Herramienta | Versión | Verificar con |
|---|---|---|
| Node.js | 22 LTS (el backend pide 20 o más; la web, 20.19 o más) | `node -v` |
| npm | el que trae Node | `npm -v` |
| Git | 2.x | `git --version` |

- El repo trae un `.nvmrc` con `22`: si usás nvm, corré `nvm use` en la raíz.
- Necesitás acceso al repositorio en GitHub y las claves del proyecto de Supabase compartido (sección 3).
- Una cuenta de [Supabase](https://supabase.com) solo hace falta si vas a armar tu propia base (sección 6).
- Para el mobile: Android Studio con un emulador (AVD). Está en la sección 9.

---

## 2. Clonar el repo

```bash
git clone https://github.com/irolon/parcial-2-ap-acn5bv-queimalinos-rolon.git
cd parcial-2-ap-acn5bv-queimalinos-rolon
git checkout develop
```

---

## 3. Variables de entorno del backend

Los dos usamos el **proyecto de Supabase de desarrollo compartido**: ya tiene el schema, el seed de ejercicios y los usuarios de prueba. Las claves **se piden por privado al equipo** y nunca se commitean (`.env` está en `.gitignore`).

```bash
cp backend/.env.example backend/.env
```

En PowerShell: `Copy-Item backend/.env.example backend/.env`.

Completá `backend/.env`:

| Variable | ¿Obligatoria? | Qué es |
|---|---|---|
| `SUPABASE_URL` | **Sí** | URL del proyecto (Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí** | Clave `service_role`. Solo del backend, nunca en el front ni en el mobile |
| `JWT_SECRET` | **Sí** | Secreto para firmar los tokens. Mínimo 32 caracteres |
| `SUPABASE_ANON_KEY` | No | Clave `anon`. Solo la usa `npm run db:check-anon` |
| `PORT` | No | Puerto del server. Por defecto `3001` |
| `NODE_ENV` | No | Por defecto `development` |
| `JWT_EXPIRES_IN` | No | Vida del access token. Por defecto `1h` |
| `JWT_REFRESH_EXPIRES_IN` | No | Vida del refresh token. Por defecto `30d` |
| `FRONTEND_URL` | No | Único origen que acepta el CORS. Por defecto `http://localhost:5173` |
| `CRON_ENABLED` | No | Jobs nocturnos (03:00 Buenos Aires) dentro del server: gamificación y luego alerta de inactividad. Por defecto activo; `false` los apaga. En tests siempre están apagados |
| `FCM_SERVICE_ACCOUNT_PATH` | No | Ruta al JSON de la cuenta de servicio de Firebase (desarrollo local, fuera del repo). Ver [Firebase / FCM](#firebase--fcm-push) |
| `FCM_SERVICE_ACCOUNT_JSON` | No | El mismo JSON en base64 (VPS). Si están las dos, gana la ruta. Sin ninguna, el push queda apagado y las notificaciones se guardan igual |
| `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` | No | Chat IA. Se usan en fases posteriores; dejalas vacías |

Para generar un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Cada uno puede tener su propio `JWT_SECRET`: solo firma tokens de tu server local.

> Nunca pegues claves en el chat de un asistente, en un issue ni en un commit. Si se filtra una, avisá al equipo para rotarla.

### Firebase / FCM (push)

Las notificaciones push usan Firebase Cloud Messaging con la API **HTTP v1** y una cuenta de servicio (no existe `FCM_SERVER_KEY`: Google apagó esa API en 2024; ver [[adr/0006-notificaciones-tabla-fuente-de-verdad-fcm-v1|ADR 0006]]). Es opcional: **sin credenciales el push queda deshabilitado** (el backend avisa una vez en el log) y las notificaciones se siguen guardando en la base, así que podés desarrollar todo lo demás sin Firebase.

Pasos (los hace una sola persona del equipo, una vez):

1. Entrá a la [consola de Firebase](https://console.firebase.google.com/) y creá el proyecto (por ejemplo `fittrainer`). Google Analytics no hace falta.
2. Generá la clave de la cuenta de servicio: **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un JSON con `project_id`, `client_email` y `private_key`.
3. Guardá ese JSON **fuera del repo** (por ejemplo `C:\secretos\fittrainer-firebase.json`). Es una credencial: no se commitea, no se pega en chats ni issues. Si se filtra, se revoca en la misma pantalla y se genera otra.
4. Configurá el backend:
   - **Local:** en `backend/.env`, `FCM_SERVICE_ACCOUNT_PATH=C:\secretos\fittrainer-firebase.json`.
   - **VPS:** codificá el JSON en base64 y pegalo en `FCM_SERVICE_ACCOUNT_JSON`. En Linux: `base64 -w0 fittrainer-firebase.json`. En PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("fittrainer-firebase.json"))`.
5. Agregá la app Android al proyecto (**Configuración del proyecto → Tus apps → Android**) con el nombre de paquete `com.fittrainer`, descargá `google-services.json` y pasáselo a Igna para el módulo mobile (lo integra él en la app).
6. Reiniciá el backend. Si la credencial es válida no aparece el aviso `FCM deshabilitado`; si falta un campo o el JSON es ilegible, el aviso lo dice y el push sigue apagado.

El push real al celular se prueba cuando la app Android registre su token (`POST /notifications/tokens`); mientras tanto el backend puede verificarse contra FCM con `validate_only` y con un token inválido (se espera `UNREGISTERED` y que el token se borre).

---

## 4. Instalar y levantar

```bash
cd backend
npm install
npm run dev
```

`npm run dev` usa nodemon: se reinicia solo al guardar. Si todo está bien, ves:

```
🚀 FitTrainer API escuchando en http://localhost:3001 [development]
```

Si falta una variable, el server no arranca y dice `❌ Variables de entorno inválidas:` con el detalle (ver sección 12).

---

## 5. Verificar que funciona

Con el server corriendo, en otra terminal:

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"...","version":"0.1.0"}

curl http://localhost:3001/health/db
# {"db":"connected","latency_ms":...}
```

- `/health` solo dice que el server está vivo.
- `/health/db` consulta Supabase. Si da **503** con `{"db":"error",...}`, las claves están mal o el proyecto está pausado.

Login con un usuario de prueba (pedí la contraseña al equipo):

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"profe.card8@test.com","password":"LA_CONTRASEÑA"}'
# {"user":{...,"role":"trainer"},"token":"...","refresh_token":"...","expires_in":"1h"}
```

Los `curl` de esta guía son para Git Bash, macOS y Linux. En PowerShell, `curl` es un alias de otro comando; el login se hace así:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/auth/login -ContentType 'application/json' -Body '{"email":"profe.card8@test.com","password":"LA_CONTRASEÑA"}'
```

Tests y lint (en `backend/`):

```bash
npm test
npm run lint
```

`npm test` no necesita el `.env`: usa valores de prueba. `npm run lint` corre ESLint y el chequeo de 200 líneas por archivo.

---

## 6. Armar una base de Supabase nueva (solo si no usás la compartida)

1. Creá el proyecto en [supabase.com](https://supabase.com) y copiá las claves de **Settings → API** al `backend/.env`.
2. En el **SQL Editor**, ejecutá en orden los archivos de `backend/src/database/schema/`: `01` a `07` (el detalle está en su README).
3. Ejecutá `backend/src/database/checks/schema-checks.sql`. Tiene que devolver **0 filas**.
4. Ejecutá los seeds, en este orden (se pueden re-ejecutar): `backend/src/database/seeds/exercises.sql` (50 ejercicios globales), `achievements.sql` (catálogo de logros) y `challenges.sql` (desafíos globales de ejemplo).
5. Ejecutá `backend/src/database/checks/exercises-checks.sql`. Tiene que devolver **0 filas**.
6. Las migraciones de `backend/src/database/migrations/` se aplican **solo en bases que ya existían** antes de esos cambios. En una base nueva, el schema ya las incluye.

Antes de aplicar `2026-10-17-exercises-global-name.sql` en una base vieja, esta consulta tiene que devolver 0 filas:

```sql
select name, count(*) from exercises where is_global group by name having count(*) > 1;
```

Todas las tablas tienen RLS activado sin políticas: el backend entra con la `service_role` y valida permisos en los services ([[adr/0001-autorizacion-en-services-rls-deny-all|ADR 0001]]). No hace falta tocar RLS para desarrollar. Más sobre las tablas: [[arquitectura/modelo-de-datos|Modelo de datos (DER)]].

---

## 7. Usuarios de prueba

La base compartida tiene dos:

| Rol | Email |
|---|---|
| Entrenador | `profe.card8@test.com` |
| Alumna | `alumna.card8@test.com` |

La contraseña **no está en el repo** (es público): pedísela al equipo.

En una base nueva, se crean así (la contraseña pide 8 caracteres, una mayúscula y un número).

**1. El entrenador**, con `POST /api/auth/register`:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Profe Prueba","email":"profe@test.com","password":"UnaClave123"}'
# 201: { "trainer": {...}, "token": "...", "refresh_token": "..." }
```

**2. El alumno**, en dos pasos. Primero el entrenador crea la invitación, con el `token` del paso anterior:

```bash
curl -X POST http://localhost:3001/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_DEL_ENTRENADOR" \
  -d '{"student_name":"Alumna Prueba","student_email":"alumna@test.com","goal":"tonify","delivery_channel":"qr"}'
# 201: { "data": { "token": "...", "join_url": "...", ... } }
```

Campos de la invitación: `student_name`, `student_email`, `goal` (`tonify`, `weight_loss`, `hypertrophy` o `strength`) y `delivery_channel` (`whatsapp`, `qr` o `both`). Con `whatsapp` o `both` también hace falta `student_phone`. Opcionales: `gym_equipment`, `injuries`, `level`.

Después el alumno la acepta con `POST /api/students`, usando el `token` de la invitación (vale 48 hs):

```bash
curl -X POST http://localhost:3001/api/students \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_DE_LA_INVITACION","password":"OtraClave123"}'
```

El alumno ya puede entrar con `POST /api/auth/login`.

---

## 8. Conectar la web (`frontend/`)

El dashboard web (React + Vite) vive en `frontend/`.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

- Corre en **http://localhost:5173** (el puerto está fijo: si está ocupado, Vite falla en vez de cambiarlo).
- `VITE_API_URL` apunta a la API. Por defecto `http://localhost:3001/api`, que es lo que necesitás.
- Todo lo que va en el `.env` del front es público: nunca pongas la `service_role` ni el `JWT_SECRET`.
- **CORS:** el backend acepta un solo origen, `FRONTEND_URL` (por defecto `http://localhost:5173`). Si corrés la web en otro puerto, cambiá `FRONTEND_URL` en `backend/.env` y reiniciá el backend.
- Tests y lint del front: `npm test` y `npm run lint`.

---

## 9. Conectar el mobile (emulador de Android)

Abrí `mobile/` en Android Studio, copiá `mobile/.env.example` a `mobile/.env` y revisá `API_BASE_URL`:

| Dónde corre la app | `API_BASE_URL` | Antes |
|---|---|---|
| Emulador de Android Studio | `http://10.0.2.2:3001/api` | nada |
| Celular físico por USB | `http://localhost:3001/api` | `adb reverse tcp:3001 tcp:3001` |

- En el emulador, `localhost` es el emulador mismo, no tu PC. `10.0.2.2` es el alias de tu PC.
- Con HTTP, la app solo permite esos dos hosts (`network_security_config.xml`). **La IP de tu PC por wifi no funciona**: tendría que ser HTTPS.
- Con el backend corriendo y el `.env` en su lugar, la app le pega sin cambiar nada más.
- `JOIN_LINK_HOST` va con el host de `FRONTEND_URL`, sin puerto (`localhost`).

---

## 10. Docker (opcional)

El camino recomendado es el backend nativo de las secciones anteriores. Docker queda como opción: lo mantiene Igna y se retoma en el S7 (deploy).

```bash
# Desde la raíz, con backend/.env completo
docker compose up --build
```

La API queda en `http://localhost:3001`. Si el puerto está ocupado: `API_PORT=3002 docker compose up --build`. Los archivos son `docker-compose.yml` (desarrollo) y `docker-compose.prod.yml` (VPS).

---

## 11. Scripts del backend

Todos se corren desde `backend/`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Nodemon con hot reload |
| `npm start` | Node directo (producción) |
| `npm test` | Tests (Jest) |
| `npm run test:watch` | Jest en modo watch |
| `npm run test:coverage` | Tests con cobertura |
| `npm run lint` | ESLint + chequeo de 200 líneas por archivo |
| `npm run lint:fix` | ESLint con autofix |
| `npm run format` | Prettier sobre `src`, `tests` y `scripts` |
| `npm run db:check-anon` | Verifica que la clave `anon` no vea filas por la API pública (lee `SUPABASE_URL` y `SUPABASE_ANON_KEY` del `.env`) |
| `npm run gamification:daily` | Corre una vez el job diario de gamificación (idempotente) |
| `npm run notifications:inactivity` | Corre una vez la alerta de inactividad: avisa al PT de los alumnos con 3 o más días asignados sin entrenar (máximo un aviso por alumno cada 7 días) |

Antes de abrir una PR: `npm test` y `npm run lint` en verde, y probar a mano lo que tocaste. Reglas de código y ramas: ver `CONTRIBUTING.md`.

---

## 12. Problemas frecuentes

> [!note]- ❌ El server dice "Variables de entorno inválidas"
> Falta una variable obligatoria: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` o `JWT_SECRET`. El mensaje dice cuál (`Falta la variable de entorno ...`). Revisá que el archivo se llame `backend/.env` (no `.env.example`) y que no tenga espacios en los valores.

> [!note]- ❌ "JWT_SECRET debe tener al menos 32 caracteres"
> Generá uno con el comando de la sección 3.

> [!note]- ❌ El puerto 3001 ya está en uso
> ```bash
> netstat -ano | findstr :3001   # Windows
> lsof -i :3001                  # Mac/Linux
> ```
> Cerrá el proceso, o cambiá `PORT` en `backend/.env`. Si lo cambiás, ajustá también `VITE_API_URL` (web), `API_BASE_URL` (mobile) y el puerto de `adb reverse tcp:<puerto> tcp:<puerto>` si usás un celular físico. `FRONTEND_URL` no cambia: es el origen de la web, no el de la API.

> [!note]- ❌ `/health/db` responde 503
> Las claves de Supabase están mal, o el proyecto está pausado (el plan gratis pausa por inactividad). Revisá `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: la `service_role`, no la `anon`.

> [!note]- ❌ La web da error de CORS
> La web tiene que correr en el origen de `FRONTEND_URL`. Si no está en `http://localhost:5173`, cambiá `FRONTEND_URL` en `backend/.env` y reiniciá el backend.

> [!note]- ❌ El emulador dice "Connection refused"
> Estás usando `localhost`. En el emulador va `http://10.0.2.2:3001/api`.

> [!note]- ❌ La app en un celular por wifi no conecta
> Con HTTP no funciona: la app corta cualquier host que no sea `10.0.2.2` o `localhost`. Conectá el celular por USB y corré `adb reverse tcp:3001 tcp:3001`.

> [!note]- ❌ `npm install` o el server fallan por la versión de Node
> Usá Node 22 (`nvm use`). El backend funciona desde Node 20, pero la web (Vite 8) necesita 20.19 o más.

---

## 13. Contacto del equipo

Quién hace qué está en [[producto/equipo|Descripción del equipo]]. El tablero del equipo: https://trello.com/b/yBj0xE8S

---

> **Última actualización:** 18/10/2026 · FitTrainer — Proyecto Final de Analista de Sistemas
