# Logros, rachas y desafíos en mobile — diseño

Tarjeta 15 (https://trello.com/c/ok2sUh8B). Fecha: 31/10/2026.

## 1. Objetivo y criterio de aceptación

El alumno ve su racha, sus medallas y sus desafíos activos, y siente algo cuando desbloquea un logro, sin
que cada serie desbloquee algo.

Criterio de la tarjeta: al séptimo día el alumno ve la celebración del logro de racha; en la pantalla de logros
ve los desbloqueados a color y el resto en gris con progreso; todo funciona en modo avión.

> El criterio dice "3 desbloqueados y 7 en gris" con un catálogo de 10. El catálogo real (seed de Pablo) tiene
> 11 logros: se prueba con los datos que haya, desbloqueados a color y los demás en gris con su progreso.

Decisiones del debate (Igna, 31/10):

1. El progreso de los bloqueados sale de un endpoint nuevo del backend (no se puede calcular en el celular:
   su caché del historial guarda solo las 20 sesiones más recientes).
2. La celebración es inmediata también en modo avión: el celular evalúa racha y cantidad de sesiones al cerrar
   la sesión; el resto llega con el sync.
3. Desafíos: solo ver (activos y terminados). Tomar desafíos queda afuera.
4. Ramas: backend en `feature/gamification-progress` desde `develop`; mobile en `feature/android-logros` desde
   `feature/android-graficos` (tarjeta 13) con un merge de `feature/android-mis-rutinas`.

Orden de merge: la rama mobile necesita la PR del backend (`/achievements/progress` con `assigned_days`)
mergeada antes.

Fuera de alcance: vista del entrenador, tomar desafíos, notificaciones push de logros.

## 2. Backend: `GET /api/students/:id/achievements/progress`

Rama `feature/gamification-progress` (worktree `fittrainer-gamification-progress`), desde `develop`.

- **Acceso:** trainer dueño o el propio alumno (`assertCanAccessStudent`), con el mismo `studentScoped` de
  `student-gamification.routes.js`. Va antes que cualquier ruta con parámetro que pudiera capturarla.
- **Solo lectura.** No escribe racha, logros ni desafíos (a diferencia de `GET /streak` sin fila, que evalúa
  y persiste).
- **Sin reglas duplicadas.** Se extrae de `evaluateStudent` la carga de datos (sesiones cerradas, días
  asignados, récords) a una función compartida, p. ej. `loadEvaluationInput(studentId, now)`, que devuelve
  lo que necesita `buildFacts`. `evaluateStudent` la usa y su comportamiento no cambia (sus tests siguen igual).
- **Respuesta 200:**

  ```json
  { "data": {
      "streak": { "current_streak_days": 6, "longest_streak_days": 9, "last_session_date": "2026-10-30" },
      "facts": { "sessions_count": 3, "longest_streak": 9, "pr_sessions": 1, "full_weeks": 0 },
      "assigned_days": ["monday", "thursday"],
      "achievements": [
        { "id": "…", "code": "SESSIONS_10", "name": "10 sesiones", "description": "…", "category": "milestone",
          "icon_url": null, "criteria_type": "sessions_count", "current": 3, "target": 10, "unlocked_at": null }
      ] } }
  ```

  - `streak` se calcula con `computeStreak` en el momento (mismo formato que `GET /streak`), no se lee de
    `student_streaks`: así sale coherente con `facts`.
  - `achievements`: el catálogo completo, en el orden de `findCatalog` (categoría, código).
  - `criteria_type` = `criteria.type` (el celular lo necesita para su cuenta local, §3.3).
  - `assigned_days`: los días asignados con los que se calculó la racha (el celular cuenta sobre ellos, §3.3).
  - `target` por tipo de `criteria`: `sessions_count`/`pr_count` → `value`, `streak` → `days`,
    `full_week` → `count`, `challenge` → 1. Tipo desconocido → `target` 1 y `current` 0.
  - `current` = el dato que corresponde (`sessionsCount`, `longestStreak`, `prSessions`, `fullWeeks`),
    recortado a `target`. `challenge` → 1 si está desbloqueado, 0 si no.
  - Desbloqueado (`unlocked_at` no nulo) → `current = target` siempre, aunque los datos hayan bajado
    (p. ej. se cambió la rutina).
- **Tests:** unit del service (cada tipo, recorte, desbloqueado con datos menores, `challenge`, sin sesiones,
  tipo desconocido, que no escribe) y de la ruta (200, 403 alumno inexistente o ajeno (assertCanAccessStudent no distingue, a propósito), validación del id),
  copiando el árbol de `tests/unit/`. `npm run lint` y `npm test` en verde.
- **Docs:** fila nueva en la tabla de Gamificación de `backend/README.md` (aviso a Pablo, mismo commit que el
  código) y la sección del endpoint en `docs/arquitectura/contratos-api.md`.

## 3. Mobile: datos

Rama `feature/android-logros` (worktree `fittrainer-logros`). Room pasa de v9 (tarjeta 13) a **v10** con una
`AutoMigration(9→10)` que solo crea tablas, y su test `MigrationTo10Test` (archivo propio en
`androidTest/.../data/db/migration/`). Todo lo nuevo se borra en el
logout (`UserDataCleaner`).

### 3.1 Tablas

- **`gamification_snapshot`** (PK `ownerId`): `currentStreak`, `longestStreak`, `lastSessionDate`
  (`YYYY-MM-DD` o null), `sessionsCount`, `prSessions`, `fullWeeks`, `fetchedAt` (reloj del celular al recibir
  la respuesta) y `assignedDays` (los `assigned_days` del servidor, separados por coma; vacío = sin rutina).
- **`achievement_progress`** (PK `ownerId` + `code`): `achievementId`, `name`, `description`, `category`,
  `criteriaType` (`criteria_type` del endpoint), `current`, `target`, `unlockedAt` (millis o null),
  `position` (orden del servidor).
- **`student_challenges`** (PK `id`): `ownerId`, `name`, `description`, `goalType`, `goalValue`,
  `currentProgress`, `progressPct`, `status` (`active` | `completed` | `failed` | `abandoned`), `startedAt`,
  `endsAt`, `completedAt`.
- **`celebrations`** (PK `ownerId` + `code`): `name`, `description`, `category`, `state` (`PENDING` |
  `SHOWN`), `createdAt`. Una fila por logro: si ya existe, nadie la vuelve a crear (así no se celebra dos veces).

### 3.2 Repositorio y refresco

`GamificationRepository` (en `data/gamification/`) refresca desde la API: `GET .../achievements/progress` y
`GET .../challenges`, en una transacción que reemplaza las filas de la cuenta. Single-flight (Mutex) como
`RoutineRepository`. Refrescan:

- Hoy y Progreso al quedar visibles, al volver la red y con pull-to-refresh, con el `RefreshController` de
  "Mis rutinas";
- el sync, después de cada pasada que subió al menos una sesión.

Un pedido que vuela durante el logout no escribe (mismo control de generación/dueño que `HistoryRepository`).

### 3.3 Cuenta local (racha y sesiones)

Una sesión llega al servidor recién terminada (`POST /sessions` ya lleva `finished_at`), así que **toda sesión
local `FINISHED` con `finishedAt > snapshot.fetchedAt` seguro no está en la foto**. Esas son las "sesiones
extra". Las que terminaron antes de la foto pero todavía no subieron no se suman: cuenta de menos, nunca de más.
`finishedAt` solo decide si la sesión está en la foto; el día de una extra es el día BA de su `startedAt`, como
en el backend. Se excluyen las sesiones rechazadas por el servidor (`FAILED`, un 400/409): él nunca las tiene y
sumarlas sobre-cuenta.

- **Sesiones:** `snapshot.sessionsCount + extras`.
- **Racha** (día de `America/Argentina/Buenos_Aires`, no el del celular): se parte de
  `snapshot.currentStreak` y `snapshot.lastSessionDate`, y se recorren en orden los días (BA) de las extras que
  sean posteriores a `lastSessionDate`. Para cada día nuevo `d`: si entre `lastSessionDate` y `d` (sin incluir
  ninguno de los dos) hay un día asignado sin entrenar, la racha vuelve a 1; si no, suma 1. Sin
  `lastSessionDate`, el primer día deja la racha en 1. `longest = max(snapshot.longestStreak, racha)`.
  Días asignados: los `assigned_days` de la foto; sin ninguno, todos los días son asignados (ADR 0005). Si los
  días de las rutinas activas en Room cambiaron respecto de los de la foto, las extras no suman a la racha (sí a
  las sesiones): la cuenta local no puede saber cómo se habría cortado. Al final, con `L` = el último día entrenado (el de la última extra o `lastSessionDate`): si entre
  `L` y hoy (sin incluirlos) hay un día asignado sin entrenar, la racha actual es 0 (se cortó y la foto todavía
  no lo sabe); `longest` no cambia.
- La regla vive en una función pura (`localStreak(...)`), con tests que replican los casos de
  `computeStreak` del backend (días no asignados que no cortan, hoy que no corta, sin rutina, cambio de día BA).
- **Uso:** el chip de Hoy y la racha de la pantalla Logros muestran la racha actual local. El progreso de los
  logros `sessions_count` usa las sesiones locales y el de `streak` la racha más larga local (como el
  `longestStreak` del backend), recortados a `target`. Un bloqueado cuyo progreso local llegó al `target`
  se ve lleno, en gris, con "Se confirma al sincronizar" (`awaitingSync` solo para `sessions_count` y `streak`).

### 3.4 Celebraciones

Se crea una fila `PENDING` (si no existe una para ese logro) en tres casos:

1. **La cuenta local:** no se evalúa en `WorkoutRepository.finish` sino en `CelebrationViewModel`, cada vez que
   cambian la foto o las sesiones terminadas (y al abrir la app): se recalcula la cuenta local y cada logro
   `sessions_count` o `streak` todavía bloqueado en Room cuyo progreso local llegó al `target`. Con guarda de
   dueño: si la cuenta cambia o se cierra sesión antes del insert, no se escribe nada. Sin foto (nunca
   sincronizó) no se evalúa nada.
2. **El sync:** `POST /sessions` y `POST /sessions/:id/sets` devuelven `unlocked_achievements`
   (`[{ code, name, category }]`); el uploader los pasa al repositorio. `SessionApi.create` pasa a devolver la
   respuesta (hoy devuelve `Unit`).
3. **El refresco:** si ya había una foto y la nueva trae desbloqueado un logro que estaba bloqueado en los logros
   guardados de la foto anterior (p. ej. los otorgó el job diario de las 03:00), sin comparar fechas del servidor
   con el reloj del celular. La primera foto de la cuenta nunca celebra (no se festeja lo viejo al instalar o al
   loguearse), y un logro nuevo de catálogo que llega ya desbloqueado tampoco.

Los desafíos cumplidos se celebran por su logro premio; no hay festejo propio.

## 4. Mobile: pantallas

Colores de `FtColors`: racha en `Coral`, logros en `Green`, bloqueados en `Ink5`/`TextSecondary`. Íconos por
categoría porque `icon_url` viene null: `streak` fuego, `pr` trofeo, `consistency` calendario, `milestone` y
`volume` bandera. Toque mínimo `Spacing.minTouchTarget`. Textos en español rioplatense.

### 4.1 Hoy

Chip coral con fuego y "N días" ("1 día" en singular) debajo de `TodayHeader`, con su propio ViewModel (Hoy no
cambia), con la racha local. Con 0 no se muestra.
`contentDescription`: "Racha de N días" ("Racha de 1 día").

### 4.2 Progreso: bloque "Logros recientes"

Entre el resumen de la semana y las solapas Historial | Gráficos: fila de tres mini-stats (**Racha** local,
**Récords** = `prSessions`, **Semanas completas** = `fullWeeks`) y, debajo, las últimas 3 medallas
desbloqueadas (por `unlockedAt`) con el link **"Ver logros ›"**. Sin foto: "Conectate una vez para ver tus
logros" (el link igual abre la pantalla).

### 4.3 Pantalla Logros

Ruta `student/progress/achievements` (`parentTab` = Progreso). Volver lleva a Progreso. Secciones, en una
lista con pull-to-refresh:

1. **Racha:** actual (local) y mejor.
2. **Desafíos activos:** nombre, barra (`progressPct`), "3 de 12 sesiones" (texto por `goalType`:
   sesiones, días de racha, kg de volumen, kg de peso objetivo) y "Quedan N días" (desde `endsAt`, día BA;
   "Termina hoy" el último día). Vacío: "Tu entrenador todavía no te asignó desafíos". Debajo, **Terminados**
   (completados con "Cumplido", vencidos/abandonados con "No se cumplió"), plegados por defecto.
3. **Medallas:** grilla de 3 columnas. Desbloqueadas a color con la fecha corta, de la más nueva a la más
   vieja; después las bloqueadas en gris con barra y "3/10", de la más cercana a la más lejana (por
   `current/target`). La de tipo `challenge` bloqueada no tiene barra: "Cumplí un desafío". Tocar una medalla
   abre una hoja con la descripción y el progreso o la fecha.

Estados: nunca sincronizó → mensaje con "Reintentar"; falla de refresco con datos → aviso como en las otras
pantallas (lo de Room se sigue viendo).

### 4.4 Celebración

`CelebrationHost` en el `RoleShell` del alumno observa las filas `PENDING` y **no aparece mientras la ruta
actual es la sesión activa** (`WORKOUT_ROUTE`): sale apenas el alumno la deja (después del resumen y el RPE) o
al abrir la app.

- 1 o 2 pendientes: un diálogo por logro, de a uno. 3 o más: un solo diálogo "Desbloqueaste N logros" con la
  lista.
- Diálogo a pantalla completa: la medalla entra con una animación de escala, vibración corta
  (`HapticFeedbackType.LongPress`), nombre, descripción y botón **"Seguir"**, que marca las filas mostradas
  como `SHOWN`.
- El diálogo scrollea con **"Seguir"** fijo abajo; Atrás y tocar afuera no lo cierran.
- Si la app se cierra con el diálogo abierto, queda `PENDING` y sale la próxima vez.

## 5. Errores y bordes

- Sin red nunca: Hoy sin chip, Progreso con el mensaje de §4.2, Logros con "Reintentar". El cierre de sesión
  no celebra (no hay foto).
- Cambio de cuenta: todo se borra en el logout; un refresco o un sync en vuelo no escribe filas del dueño
  anterior.
- El sync ignora las fallas de la gamificación (`SyncPass`): nunca cortan la subida. Caso aceptado: si se cierra
  sesión con "Cerrar igual" teniendo subidas pendientes y se vuelve a entrar, un logro ya festejado localmente
  puede festejarse otra vez cuando el sync lo confirme (el logout borra las celebraciones).
- Reloj del celular atrasado o adelantado: puede sumar o no una extra cerca del `fetchedAt`; el peor caso es
  no celebrar en el momento (lo hace el sync) o celebrar una sesión que el servidor también cuenta. Para
  acotarlo, `fetchedAt` se guarda con el mismo reloj que `finishedAt`.
- Sesión cerrada cerca de la medianoche: el día lo define BA en los dos lados, igual que el backend.
- El backend falla al evaluar (`safeEvaluate` devuelve `[]`): no llega nada por el sync; el refresco siguiente
  lo celebra por el caso 3 si el job diario lo otorga.

## 6. Pruebas

- **Backend:** los tests de §2.
- **Mobile, unit:** `localStreak` (casos del backend), sesiones extra contra `fetchedAt`, mapper del DTO,
  repositorio (reemplazo, single-flight, logout en vuelo, caso 3 de celebración y primera foto sin festejo),
  evaluación al cerrar (crea `PENDING` solo para lo bloqueado que llegó al `target`, nada sin foto), uploader
  pasando `unlocked_achievements`, lógica del host (oculto en la sesión, agrupado con 3 o más), estados de la
  UI (orden de medallas, textos de desafíos, días que quedan).
- **Mobile, instrumentado:** migración 9 → 10 (`MigrationTo10Test`) y el DAO de gamificación (`GamificationDaoTest`: las celebraciones se insertan con IGNORE y las sesiones terminadas excluyen activas, sin cierre y rechazadas).
- **E2E (emulador, backend local, `alumna.card8`):** sembrar en Supabase dev sesiones cerradas en días
  asignados para que la racha quede en 6; en modo avión cerrar la sesión del día → celebración "Racha de 7
  días" al salir de la sesión; volver la red → el sync no la repite; la pantalla Logros muestra desbloqueados a
  color y el resto en gris con progreso, también en modo avión.
- `gradlew checkFileLength assembleDebug testDebugUnitTest` en verde; ningún archivo de más de 200 líneas.
