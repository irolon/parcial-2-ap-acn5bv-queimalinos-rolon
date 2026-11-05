# E13 · Agenda de turnos del entrenador en el celular — diseño

Tablero *App del ENTRENADOR*, tarjeta E13. Rama `feature/android-entrenador-agenda` sobre `develop` (`9470b4d`, ya con el backend de agenda de la #49). Usa el contrato de `docs/arquitectura/contratos-api.md` (módulos Disponibilidad y Turnos) y copia el comportamiento de la web de la #49 (`frontend/src/pages/agenda/`, vista de menos de 768 px).

## Objetivo y criterio de aceptación

El entrenador ve en el celular los turnos de la semana y su disponibilidad, iguales a los de la web. Desde ahí confirma los pendientes y cancela los pendientes o confirmados.

**Criterio:**
- Con dos turnos pendientes en la semana, el PT ve la misma semana que en la web.
- Confirma uno y cancela el otro (con confirmación), y la web muestra los dos cambios.
- Sin red, la última semana bajada se sigue viendo.

## Decisiones

| # | Decisión | De quién |
|---|---|---|
| 1 | Alcance: ver la semana (turnos y disponibilidad) y confirmar o cancelar. «Nuevo turno» y editar la disponibilidad quedan en la web. | Igna, 05/11 |
| 2 | Entrada desde **Más → Agenda**, junto a Plantillas, Biblioteca y Desafíos. | Igna, 01/11 (debate E8–E14) |
| 3 | La semana se ve como **lista por día**, como la web debajo de 768 px. No hay grilla. | Igna, 05/11 |
| 4 | Room es la fuente de verdad: la semana y la disponibilidad se leen de Room y se refrescan desde la API. Confirmar y cancelar son solo con red, sin cola offline, como las demás ediciones del PT (E8). | Igna, 05/11 |
| 5 | Navegación de semanas con ‹ / Hoy / ›. | Igna, 05/11 |
| 6 | La disponibilidad del día se muestra en el encabezado de cada día («09–13 · 17–21» o «Sin disponibilidad»). La web la sombrea en la grilla; en lista no hay celdas, así que va como texto. | Claude |
| 7 | Toggle «Mostrar cancelados», apagado por defecto, igual que la web. | Claude (paridad) |
| 8 | Los avisos `appointment` (el alumno pidió o canceló un turno) aparecen en el centro de notificaciones del PT y, al tocarlos, abren la Agenda en la semana actual. El `data` solo trae `appointment_id` y no alcanza para elegir la semana sin otro pedido. Hoy esos avisos se descartan. | Claude |
| 9 | Para el alumno, el tipo `appointment` también se deja de descartar: el aviso se ve en su lista y al tocarlo se queda en la lista. Su pantalla de turnos es la tarjeta 16. | Claude |

## Datos

### API (`data/api/agenda/`)

Retrofit `AgendaApi`, en el cliente autenticado:
- `GET availability` → `{ data: [{ weekday, start_time, end_time }] }`.
- `GET appointments?from&to` (días `YYYY-MM-DD` de Argentina, inclusivos) → `{ data: [turno] }`.
- `PATCH appointments/{id}` con `{ status }` → `{ data: turno }`.

Turno: `{ id, trainer_id, student: { id, name, avatar_url }, scheduled_at, duration_min, status, notes, created_at }`. Los campos opcionales del DTO van con default.

### Room v23 (`data/db/agenda/`)

Dos tablas de datos y dos de sincronización, con `AutoMigration(22, 23)` porque todas son nuevas:

- `trainer_appointments`
  - Columnas: `trainerId`, `id`, `studentId`, `studentName`, `studentAvatarUrl?`, `scheduledAt` (epoch ms), `status` (texto del wire), `notes?`, `createdAt`.
  - PK `(trainerId, id)`, índice `(trainerId, scheduledAt)`.
- `trainer_agenda_weeks`
  - Columnas: `trainerId`, `weekStart` (`YYYY-MM-DD` del lunes), `fetchedAt`.
  - PK `(trainerId, weekStart)`.
  - Dice que esa semana se bajó alguna vez.
- `trainer_availability`
  - Columnas: `trainerId`, `weekday`, `startHour`, `endHour`.
  - PK `(trainerId, weekday, startHour)`.
- `trainer_availability_sync`
  - Columnas: `trainerId`, `fetchedAt`.

**Reglas de guardado:**
- Refrescar una semana reemplaza en una transacción los turnos con `scheduledAt` en `[lunes 00:00, lunes siguiente 00:00)` de Argentina y escribe su fila en `trainer_agenda_weeks`.
- Refrescar la disponibilidad reemplaza todas sus filas.
- Un `PATCH` exitoso hace upsert del turno que devuelve el servidor.

El repositorio implementa `UserDataCleaner`: se borra al cerrar sesión, por dueño o todo.

### Repositorio (`data/agenda/`)

`TrainerAgendaRepository`, en el estilo de `TrainerChallengesRepository`, con un `Mutex` por entrenador que abarca la red y Room.

**Lectura:**
- `observeWeek(trainerId, weekStart): Flow<AgendaWeekCache?>` (null si la semana nunca se bajó).
- `observeAvailability(trainerId): Flow<AvailabilityCache?>`.
- `refreshWeek(trainerId, weekStart)`: un solo pedido con `from` = lunes y `to` = domingo.
- `refreshAvailability(trainerId)`.

**Escritura:**
- `updateStatus(trainerId, appointmentId, status)`.
- Si responde 409 (`INVALID_STATUS_TRANSITION` o `APPOINTMENT_PAST`):
  - el error es `AppointmentConflictException`, con el mensaje del backend;
  - la ViewModel refresca la semana, así la lista muestra el estado nuevo.
- Si responde 403 (turno ajeno o inexistente):
  - el turno sale de Room;
  - el error es `AppointmentGoneException`.
- Los demás errores van por `toDataError()` como siempre.

### Dominio

- `Appointment(id, studentId, studentName, avatarUrl, at: Instant, status: AppointmentStatus, notes)`.
- `AppointmentStatus { PENDING, CONFIRMED, CANCELLED }`. Un valor desconocido del wire se guarda tal cual y se muestra como cancelado y sin acciones.
- `AvailabilitySlot(weekday 1..7, startHour, endHour)`.

**Fechas:**
- Todo en `ARGENTINA` (`data/students/TrainerStudent.kt`; si hace falta, se mueve a un lugar común).
- La semana va de lunes a domingo.
- Utilidades puras y testeables en `ui/agenda/trainer/` o `data/agenda/`:
  - el lunes de un instante;
  - correr ± n semanas;
  - el título «SEMANA DEL 2 AL 8 NOV» (o «DEL 27 OCT AL 2 NOV» si cruza de mes);
  - la etiqueta del día «LUN 02»;
  - el rango «Vie 06/11 · 18:00–19:00».

## UI (`ui/agenda/trainer/`)

**`AgendaScreen`:**
- **Encabezado:** volver, título «Agenda» y subtítulo con la semana.
- **Barra:** ‹ Hoy › y el switch «Mostrar cancelados».
- **Lista de los 7 días.** Cada día es una tarjeta con:
  - la etiqueta, en acento si es hoy;
  - la disponibilidad del día;
  - los turnos ordenados por hora, cada uno una fila de toque mínimo de 44 dp: hora «18:00», nombre y estado en mono («PENDIENTE» / «CONFIRMADO» / «CANCELADO»).
- **Colores por estado** (los mismos tokens que en el resto de la app):
  - pendiente: color de aviso (warn);
  - confirmado: verde (good);
  - cancelado: gris tachado.
- **«Sin turnos»:** un día vacío lo muestra solo si la semana ya se bajó.
- **Leyenda** de colores al pie.

**Estados de la pantalla:**
- Cargando la primera vez (sin caché de la semana).
- Error con «Reintentar», si no hay caché y falló.
- Sin red: banner de la app, con la última semana guardada.
- Aviso suave si falla un refresco con caché.
- Pull-to-refresh.
- Al cambiar de semana se muestra lo guardado de esa semana, o el cargando, y se refresca.

**`AppointmentSheet`** (hoja inferior al tocar un turno):
- Muestra avatar con inicial, nombre, «Vie 06/11 · 18:00–19:00», estado y nota.
- Si el turno ya pasó: «Este turno ya pasó», sin botones.
- Si está cancelado: sin botones.
- Si está pendiente: «Confirmar» y «Cancelar turno».
- Si está confirmado: «Cancelar turno».
- Cancelar pide confirmación dentro de la hoja:
  - texto: «¿Cancelar el turno de Lucía del vie 06/11 a las 18:00? Le avisamos.»;
  - botones: «Volver» y «Sí, cancelar turno».
- Mientras va el pedido, los botones quedan deshabilitados con progreso.
- Si sale bien, la hoja se cierra.
- Si falla, el error va inline en la hoja:
  - el mensaje del backend en 409, y la semana se refresca;
  - «Este turno ya no existe» en 403;
  - «Sin conexión: confirmá o cancelá cuando vuelva la red» sin red.
- Sin red los botones se ven deshabilitados, con el mismo texto.

**Navegación:**
- `TRAINER_AGENDA_ROUTE = "trainer/agenda"`, en un archivo de rutas propio de `navigation/trainer/`.
- `MenuLink("Agenda")` en `TrainerMenuLinks`.
- El destino de notificación `NotificationDestination.Agenda` navega a esa ruta.

## Notificaciones

- `NotificationType.APPOINTMENT("appointment")`.
- `destinationOf("appointment", …)` → `Agenda` para el entrenador y `NotificationsList` para el alumno.
- Un push `appointment` llega solo al alumno (política de la #49). El intent de un push se resuelve sin rol, así que el default es la lista.
- El texto del aviso lo trae el backend (`title` / `body`).

## Tests

**Unitarios:**
- Repositorio:
  - el refresco reemplaza solo la semana pedida;
  - el `PATCH` hace upsert;
  - el 409 da conflicto;
  - el 403 borra el turno y da gone;
  - el `Mutex` evita que un GET viejo pise un `PATCH`;
  - el limpiador funciona.
- Utilidades de fecha:
  - el lunes, también un domingo a la noche de Argentina que en UTC ya es lunes;
  - el título que cruza de mes;
  - las etiquetas.
- ViewModel:
  - el cambio de semana;
  - mostrar u ocultar cancelados;
  - las acciones según el estado y si ya pasó;
  - la confirmación de cancelar;
  - los errores 409, 403 y sin red;
  - el estado offline.
- `destinationOf` para `appointment` con los dos roles.

**Instrumentados:**
- `MigrationV23Test` (en `migration/v2x/`): 22 → 23 conserva los datos de la v22.
- Un test del DAO con el reemplazo por rango de semana.

**A mano en el emulador:**
- Con el backend local y la web abiertos a la vez, comparar la semana, confirmar y cancelar.

Todos los archivos ≤ 200 líneas y las carpetas ≤ 10 archivos (`data/api/` ya tiene 9 sueltos: lo nuevo va en `data/api/agenda/`).

## Fuera de alcance

- «Nuevo turno» y editar la disponibilidad: se hacen en la web (decisión 1).
- Turnos del alumno (pedir y cancelar): tarjeta 16.
- Push al PT: el backend no lo manda (solo fila en la base).
- Polling: igual que en la web, la agenda no se refresca sola mientras está abierta. Se refresca al entrar, al volver la red, con pull-to-refresh y al cambiar de semana.
