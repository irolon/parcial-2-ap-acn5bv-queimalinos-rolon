# Tarjeta 16 · Turnos del alumno en el celular — diseño

Tablero *MIS TAREAS*, tarjeta 16 ("Solicitud de turno en mobile"). Rama `feature/android-turnos-alumno`, apilada sobre `feature/android-entrenador-agenda` (E13, PR #77). La apilo para reusar su API, sus fechas y su dominio, y para que Room siga en orden: E13 es la v23 y esta es la **v24**.

Contrato: `docs/arquitectura/contratos-api.md`, módulos Disponibilidad (`GET /availability/free`) y Turnos (`GET /appointments`, `POST /appointments`, `PATCH /appointments/:id`), backend de la #49.

## Objetivo y criterio de aceptación

El alumno ve los horarios libres de su entrenador agrupados por día y elige uno, con una nota opcional. Confirma el pedido y ve el estado de sus turnos (pendiente, confirmado o cancelado). Puede cancelar los suyos. Cuando el PT confirma o cancela, le llega el push y, al tocarlo, abre sus turnos.

**Criterio:**
- El alumno pide un turno en un horario libre y queda pendiente.
- El PT lo confirma, desde la web o desde la E13.
- El alumno recibe el push y ve el turno confirmado.
- Los horarios que muestra la app son solo los que da el servidor como libres.

## Decisiones

Igna delegó las decisiones de esta tarjeta («dale, avisame cuando termine», 05/11). Todas son de Claude, salvo la 5 y la 6, que vienen de la tarjeta.

| # | Decisión |
|---|---|
| 1 | **Entrada:** el link «Mis turnos» en la pestaña Perfil del alumno (`AccountMenuScreen`, como Más del PT). Un push o aviso de turno también abre esa pantalla. |
| 2 | **«Mis turnos»:** los turnos del alumno desde hoy hasta hoy + 60 días (el `GET` acepta 62), ordenados por fecha. Arriba, el botón «Pedir turno». Cada fila muestra día y hora («Vie 06/11 · 18:00»), estado con el color de la E13 y nota. Tocar un turno pendiente o confirmado, si no pasó, abre una hoja con «Cancelar turno» (pide confirmación). Los cancelados se ven al final, atenuados, sin toggle: el alumno tiene pocos turnos. |
| 3 | **«Pedir turno»:** los horarios libres de hoy a hoy + 27 días (`GET /availability/free`, que para el alumno ya corta en 28 días), agrupados por día («VIE 06/11») en chips de hora. Tocar un horario abre una hoja con el día y la hora, la nota opcional (hasta 500 caracteres, con contador) y «Pedir turno». |
| 4 | **Room v24** (`AutoMigration(23, 24)`): `student_appointments` (los turnos del alumno) y `student_free_slots` (los horarios libres de la última bajada), cada una con su fila de sincronización. La UI lee siempre de Room. Los horarios libres se guardan aunque cambien rápido: así la regla de Room se cumple y sin red se ve lo último, con el aviso de que puede estar desactualizado. |
| 5 | **Pedir y cancelar son solo con red.** `POST /appointments` no acepta un id del cliente: encolarlo y reintentarlo podría duplicar el turno, igual que pasa con la mensajería (excepción de AGENTS.md). Sin red, los botones quedan deshabilitados con el motivo. |
| 6 | **Solo horarios realmente libres**, como pide la tarjeta: se muestran los del servidor, nunca uno calculado en el cliente. Si igual el servidor rechaza el pedido, la hoja muestra el mensaje del backend y la lista de horarios se refresca. Los casos son 409 `SLOT_TAKEN` (otro lo pidió en el medio), 400 `SLOT_UNAVAILABLE`, 409 `APPOINTMENT_LIMIT` (ya tiene 3 pendientes) y 403 (sin entrenador o inactivo). |
| 7 | **Después de pedir:** se guarda en Room el turno que devuelve el servidor, el horario sale de la lista de libres y se vuelve a «Mis turnos» con el aviso «Turno pedido: tu entrenador lo tiene que confirmar». |
| 8 | **Push y avisos `appointment` del alumno:** abren «Mis turnos» (`NotificationDestination.StudentAppointments`) y refrescan la lista al entrar. El push resuelve el destino sin saber el rol: como al PT nunca le llega push `appointment` (política de la #49), el push va siempre a la pantalla del alumno. El aviso de la lista sí sabe el rol: el PT va a la Agenda (E13) y el alumno a «Mis turnos». |
| 9 | **Sin entrenador:** el backend da `[]` en los horarios y 403 al pedir. La pantalla de pedir muestra «Todavía no tenés entrenador asignado» si el alumno no tiene PT. Si no se puede saber, muestra «Tu entrenador no tiene horarios libres en las próximas 4 semanas». |
| 10 | Se reusa lo de la E13: `AgendaApi` (le suma `free` y `create`), los DTO, `Appointment` y `AppointmentStatus`, las fechas de Argentina y las etiquetas de `AgendaTexts`. Si un texto compartido queda en `ui/agenda/trainer/`, se mueve a un lugar común. |

## Datos

- **API.** `AgendaApi` suma:
  - `GET availability/free?from&to` → `{ data: [{ starts_at }] }`;
  - `POST appointments` con `{ scheduled_at, notes? }` → `{ data: turno }`.
  - `scheduled_at` va en ISO con zona `-03:00`, que el backend acepta. `notes` se omite si está vacía.
- **Room v24.** Las tablas son por dueño (`studentId`):
  - `student_appointments` tiene la misma forma que `trainer_appointments`, pero con `studentId` como dueño y el nombre del PT innecesario. Refrescar reemplaza la ventana [hoy, hoy + 60 días], hora de Argentina.
  - `student_appointments_sync`.
  - `student_free_slots` (`studentId`, `startsAt`), que se reemplaza entera.
  - `student_free_slots_sync`.
- **Repositorio:** `StudentAppointmentsRepository` en `data/agenda/student/`, con el mismo patrón que `TrainerAgendaRepository`: Mutex por alumno, generación + `writeLock` para el cierre de sesión (hallazgo de Codex en E13) y `UserDataCleaner`. Errores tipados: `SlotTakenException`, `SlotUnavailableException`, `AppointmentLimitException`, `NoTrainerException` (403 al pedir), además de los de E13 para cancelar.

## UI (`ui/agenda/student/`)

- **`MyAppointmentsScreen` y su ViewModel:**
  - Encabezado con volver y título «Mis turnos».
  - Botón primario «Pedir turno», deshabilitado sin red.
  - La lista de turnos.
  - Estados: cargando, error con reintento, vacío («No tenés turnos. Pedí uno con tu entrenador.»), sin red con lo guardado, y pull-to-refresh.
  - La hoja para cancelar copia la de la E13: confirmación, errores inline y scroll.
- **`RequestAppointmentScreen` y su ViewModel:**
  - Días con chips de hora, de 44 dp como mínimo.
  - La hoja de confirmación con la nota.
  - Mientras va el pedido, el botón muestra progreso y la hoja no se cierra.
  - Al salir bien, vuelve a «Mis turnos» con el aviso.
- **Navegación:** `STUDENT_APPOINTMENTS_ROUTE` y `STUDENT_REQUEST_APPOINTMENT_ROUTE`, en `navigation/student/` o al lado de las rutas del alumno. Las dos heredan la pestaña Perfil.

## Tests

- **Repositorio:**
  - el refresco por ventana;
  - pedir guarda el turno y saca el horario libre;
  - cada error del POST y su excepción;
  - cancelar;
  - Mutex y generación;
  - el limpiador.
- **ViewModels:**
  - los estados;
  - sin red;
  - pedir con éxito y con cada error (el 409 refresca los libres);
  - la nota con tope de 500;
  - cancelar con confirmación.
- `destinationOf("appointment")` para los dos roles y para el push.
- **Instrumentados:** `MigrationV24Test` y un test del DAO.
- **E2E en el emulador**, con el backend local:
  - alumna.card8 pide un turno;
  - profe.card8 lo confirma por API o desde la E13;
  - el alumno lo ve confirmado.
  - El push real no se puede probar: no hay cuenta de servicio de FCM.

Todos los archivos ≤ 200 líneas y las carpetas ≤ 10 archivos sueltos.

## Fuera de alcance

- Editar o reprogramar un turno. El backend no lo tiene: se cancela y se pide otro.
- Recordatorios antes del turno.
- Ver los turnos del alumno en la pantalla Hoy.
