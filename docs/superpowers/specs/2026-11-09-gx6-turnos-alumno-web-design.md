# GX6 · Mis turnos del alumno en la web — diseño

Ticket 6 de 9 del lote GX. Una PR, solo web. Rama sugerida: `feature/student-appointments-web`. **Sale de `develop` después del merge de la #89.**

## Contexto

En `AW_Hoy` (`alumno-web.jsx`), la tarjeta "Próximo turno" tiene un botón **"Ver agenda"**. La GW5 (#89) armó la tarjeta (`NextAppointmentCard`) sin ese botón porque "no hay pantalla de turnos del alumno en la web" (GW5, decisión 7 y Fuera de alcance).

El celular ya la tiene (tarjeta 16, `docs/superpowers/specs/2026-11-05-turnos-alumno-design.md`, `ui/agenda/student/`):

- "Mis turnos": hoy + 60 días, cancelar los propios;
- "Pedir turno": horarios libres por día en chips, nota opcional de 500 caracteres.

El backend existe completo y no cambia (`contratos-api.md` §Disponibilidad y §Turnos):

- `GET /appointments?from&to` (hasta 62 días);
- `GET /availability/free?from&to` (hasta 31; para el alumno, solo su PT y hasta ahora + 28 días);
- `POST /appointments` (alumno: `{ scheduled_at, notes? }`, nace `pending`, máximo 3 pendientes a futuro);
- `PATCH /appointments/:id` (alumno: solo `cancelled`).

En la web ya están los hooks (`hooks/agenda/useAgenda.js`: `useAppointments`, `useFreeSlots`, `useCreateAppointment`, `useUpdateAppointmentStatus`) y los colores de estado (`components/agenda/status.js`).

## Decisiones

| # | Decisión |
|---|---|
| 1 | Igual que en el celular: el alumno ve sus próximos turnos, pide uno en un horario libre de la disponibilidad de su PT y cancela los suyos. |
| 2 | Página `/alumno/turnos`, **fuera del menú** (como `WORKOUT_PATH`): el `AlSidebar` del prototipo no tiene ítem de turnos. Se entra con **"Ver agenda"** de la tarjeta "Próximo turno" de Hoy, que se ve en todos sus estados (con turno, vacía, error). |
| 3 | **Solo horarios del servidor** (`GET /availability/free`), nunca calculados en el cliente. Si el POST se rechaza (`SLOT_TAKEN`, `SLOT_UNAVAILABLE`, `APPOINTMENT_LIMIT`, 403), el diálogo muestra el texto del backend y se vuelven a pedir los libres. |
| 4 | Rangos: turnos de **hoy a hoy + 59** (el `GET` acepta 62); libres de **hoy a hoy + 27** (el backend corta en 28 para el alumno). Fechas y horas en hora argentina. |
| 5 | Con 3 pendientes a futuro (contados en la lista), los chips se deshabilitan con el motivo, igual que el 409 `APPOINTMENT_LIMIT`. El backend sigue siendo quien decide. |
| 6 | La web no es offline-first fuera del entrenamiento: sin red, el error del pedido y Reintentar, sin modo sin conexión propio. |
| 7 | **Sin cambios de backend ni de contrato.** Se reusan los hooks y `STATUS_STYLES`. Al pedir o cancelar, los hooks ya invalidan `['appointments']` y los libres, y con eso se refresca también "Próximo turno" de Hoy. |

## Diseño

**`MyAppointmentsPage`**: título "Mis turnos", subtítulo "TURNOS CON TU ENTRENADOR" (`handle` de la ruta). En `lg` son dos columnas, `[1.2fr_1fr]`; en angosto, la lista primero y "Pedir turno" debajo.

**"Tus turnos"** (`AppointmentList`, una `Card`):

- **Orden**: primero los pendientes y confirmados por fecha; al final los cancelados, con `opacity-60`, sin toggle.
- **Fila** (`AppointmentRow`):
  - "Jueves 12/11 · 18:00", con `nextAppointmentLabel` de la #89;
  - el estado con punto y color de `STATUS_STYLES`;
  - la nota en `text-ink6` (`line-clamp-2`);
  - si es `pending` o `confirmed` y no pasó, un botón ghost "Cancelar".
  - Los de hoy que ya pasaron muestran "Ya pasó" en lugar del botón.
- **Aviso**: después de pedir, arriba de la lista: "Turno pedido: tu entrenador lo tiene que confirmar." (`role="status"`, se va al cambiar de página).
- **Estados**:
  - vacío: "No tenés turnos. Pedí uno con tu entrenador.";
  - cargando: `LoadingState rows={3}` "Cargando tus turnos…";
  - error: `ErrorState` "No pudimos cargar tus turnos." con Reintentar.

**Cancelar** (`CancelAppointmentDialog`, sobre `Dialog`):

- Texto: "¿Cancelar el turno del jueves 12/11 a las 18:00?". Botones "Sí, cancelar" (peligro) y "Volver".
- Mientras va el pedido, el botón muestra `loading` y el diálogo no se cierra.
- Errores (`APPOINTMENT_PAST`, `INVALID_STATUS_TRANSITION`, `FORBIDDEN`): el texto del servidor inline; se refresca la lista.
- Al salir bien, se cierra.

**"Pedir turno"** (`FreeSlotsCard`, una `Card`):

- Los libres agrupados por día: cabecera mono "VIE 06/11" y chips de hora "18:00" de 44 px de alto como mínimo (táctil), `aria-label` "Pedir turno el viernes 06/11 a las 18:00".
- Debajo del título: "Podés tener hasta 3 turnos pendientes."
- **Estados**:
  - vacío: "Tu entrenador no tiene horarios libres en las próximas 4 semanas.";
  - con 3 pendientes: chips deshabilitados y "Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme.";
  - carga y error: los de la lista, con su propio Reintentar.

**Pedir** (`RequestAppointmentDialog`):

- Título "Pedir turno"; el día y la hora en grande.
- `Textarea` "Nota (opcional)", hasta 500, con contador "120/500".
- Botones "Pedir turno" (primario, `loading`) y "Volver".
- `POST` con `scheduled_at` = el `starts_at` del servidor; `notes` se omite si está vacía.
- Al salir bien: se cierra y aparece el aviso.
- Si sale mal: el texto del servidor inline; con `SLOT_TAKEN` o `SLOT_UNAVAILABLE` también se refrescan los libres y se cierra el diálogo al tocar "Volver".

**"Ver agenda"** en `NextAppointmentCard`: un `Link` con aspecto de botón ghost, ancho completo y el ícono `Calendar`, debajo del contenido, a `MY_APPOINTMENTS.path`. Se ve en todos los estados salvo mientras carga.

## Datos

- `GET /appointments?from=hoy&to=hoy+59` con `useAppointments`.
- `GET /availability/free?from=hoy&to=hoy+27` con `useFreeSlots`.
- `POST /appointments` `{ scheduled_at, notes? }` con `useCreateAppointment`.
- `PATCH /appointments/:id` `{ status: 'cancelled' }` con `useUpdateAppointmentStatus`.
- Sin cambios de backend, contrato ni schema.

## Archivos que toca

- **Crea**:
  - `frontend/src/pages/student/MyAppointmentsPage.jsx`;
  - en `frontend/src/components/agenda/student/` (carpeta nueva, porque `components/agenda` ya tiene 8 archivos): `AppointmentList.jsx`, `AppointmentRow.jsx`, `CancelAppointmentDialog.jsx`, `FreeSlotsCard.jsx`, `RequestAppointmentDialog.jsx`;
  - `frontend/src/utils/agenda/studentAgenda.js`, con `sortForStudent(list)`, `groupFreeSlots(slots)` (por día argentino), `pendingAhead(list, now)`, `canCancel(appt, now)` y `MAX_PENDING = 3`. `utils/agenda` queda con 8 archivos.
- **Modifica**:
  - `frontend/src/routes/routeTable.js` (90): `MY_APPOINTMENTS = { path: '/alumno/turnos', title, subtitle }`;
  - `frontend/src/routes/router.jsx` (112): una ruta en la sección del alumno;
  - `frontend/src/components/student/today/NextAppointmentCard.jsx` (44 con la #89): el link y el comentario que decía "sin botón";
  - `frontend/src/hooks/agenda/useAgenda.js` (69): solo el JSDoc de `useCreateAppointment`, que hoy dice que es del entrenador.
- **Tests (crea)**:
  - `frontend/tests/utils/agenda/studentAgenda.test.js`;
  - en `frontend/tests/pages/student/MyAppointmentsPage/`: `list.test.jsx`, `request.test.jsx` y `cancel.test.jsx`;
  - `frontend/tests/helpers/agenda/student.js`: rutas fetch de `/appointments` y `/availability/free`, y los turnos de ejemplo.
- **Tests (modifica)**:
  - `frontend/tests/pages/student/TodayPage/context.test.jsx` (96, de la #89): "Ver agenda" lleva a `/alumno/turnos`;
  - `frontend/tests/routes/routeTable.test.js`.

**Chequeo contra PRs abiertas.**

- **#89** crea `NextAppointmentCard.jsx`, `utils/agenda/nextAppointment.js` (se importa `nextAppointmentLabel` y `nextDaysRange`) y `TodayPage/context.test.jsx`. **Se abre después de su merge.**
- **#84** toca `routeTable.js` y `router.jsx` en el bloque del PT (`AI_ROUTINE`). Esta PR agrega una constante del alumno junto a `WORKOUT_PATH` y una ruta en `roleSection(ROLES.STUDENT…)`: merge automático esperado. **GX5** suma el ítem "Asistente IA" en los mismos archivos: conflicto trivial para la segunda en entrar.
- No toca `useAuthStore.js`, `AgendaPage.jsx`, los diálogos del PT (`components/agenda/dialogs/*`) ni nada de `chat` o `trainer-ai`. Tampoco backend, así que no le afectan la #76 ni la #92.

## Pruebas

**Vitest**

- `sortForStudent`: próximos por fecha y cancelados al final.
- `groupFreeSlots`: agrupa por día argentino; un `starts_at` 02:00Z cae en el día anterior.
- `pendingAhead`: cuenta solo `pending` a futuro.
- `canCancel`: no para pasados ni cancelados.
- **Lista**:
  - filas con fecha, estado y nota;
  - el cancelado atenuado al final;
  - el vacío;
  - error con Reintentar.
- **Pedir**:
  - un chip abre el diálogo con día y hora;
  - la nota se corta en 500 y el contador se actualiza;
  - el POST lleva `scheduled_at` del servidor y omite la nota vacía;
  - al salir bien aparece el aviso y el turno en la lista;
  - `SLOT_TAKEN` muestra el texto del servidor y vuelve a pedir los libres;
  - con 3 pendientes los chips quedan deshabilitados con el motivo.
- **Cancelar**: pide confirmación, manda `PATCH` con `cancelled` y refresca; un `APPOINTMENT_PAST` muestra el texto del servidor.
- **Hoy**: "Ver agenda" está con turno, sin turno y con error, y navega a la página.

**Navegador**, con el backend local, `alumna.card8` y su PT con disponibilidad cargada:

1. pedir un turno con nota;
2. verlo pendiente;
3. el PT lo confirma desde su Agenda web;
4. el alumno lo ve confirmado (y en "Próximo turno" de Hoy);
5. cancelarlo;
6. pedir el mismo horario desde dos pestañas: la segunda muestra "Ese horario ya está ocupado".

Capturas en `docs/superpowers/specs/assets/gx6/`: `01-mis-turnos.jpg`, `02-pedir-turno.jpg`, `03-cancelar.jpg`, `04-limite-pendientes.jpg`, `05-hoy-ver-agenda.jpg`, `06-angosto-375.jpg`.

## Criterio de aceptación

- Desde "Ver agenda" de Hoy, el alumno ve sus turnos, pide uno en un horario libre de su PT (queda pendiente) y cancela los suyos.
- Los horarios ofrecidos son solo los que da el servidor. Los rechazos muestran el motivo del servidor y refrescan los libres.
- Hoy refleja el cambio sin recargar.
- Lint y tests en verde; ningún archivo pasa de 200 líneas.

## Estimación

**9,5 h**:

- utils y ruta: 1 h;
- lista y cancelar: 2,5 h;
- libres y pedir: 2,5 h;
- "Ver agenda": 0,5 h;
- tests y helpers: 2 h;
- navegador y capturas: 1 h.

## Fuera de alcance

- Ítem "Turnos" en el menú del alumno, o link desde Mi perfil (el celular entra por Perfil).
- Reprogramar un turno: se cancela y se pide otro, como en el celular.
- Modalidad del turno ("VIDEOLLAMADA CON LAURA" del prototipo): el backend no la tiene.
- Avisos en la web cuando el PT confirma o cancela (el push es del celular).

## Tarjetas para el celular (Igna)

Ninguna: el celular ya tiene "Mis turnos" y "Pedir turno" (tarjeta 16, `ui/agenda/student/`) con los mismos endpoints.
