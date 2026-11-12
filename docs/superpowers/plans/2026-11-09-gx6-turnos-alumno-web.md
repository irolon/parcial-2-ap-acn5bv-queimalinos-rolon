# GX6 · Mis turnos del alumno en la web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el alumno, desde el ítem "Turnos" de su menú o desde "Ver agenda" de Hoy, vea sus turnos de hoy a hoy + 59, cancele los suyos y pida uno en un horario libre de su PT (hoy a hoy + 27), con nota opcional.

**Architecture:** solo web. Página `MyAppointmentsPage` en `/alumno/turnos` (ítem del menú del alumno) con dos `Card`: "Tus turnos" (`AppointmentList` → `AppointmentRow`, `CancelAppointmentDialog`) y "Pedir turno" (`FreeSlotsCard` → `RequestAppointmentDialog`). La lógica pura (orden, agrupado por día argentino, pendientes, si se puede cancelar, etiquetas) va en `utils/agenda/studentAgenda.js`. Se reusan los hooks de `hooks/agenda/useAgenda.js`, `STATUS_STYLES`, `Dialog`, `Textarea`, `Button` y `useSubmitLock`. Backend, contrato y schema no cambian.

**Tech Stack:** React + react-router + TanStack Query + Tailwind; Vitest + Testing Library + user-event.

**Spec:** `docs/superpowers/specs/2026-11-09-gx6-turnos-alumno-web-design.md` (manda sobre este plan; CONTRIBUTING manda sobre los dos).

## Notas (spec vs. código real)

1. **Rama.** El spec sugiere `feature/student-appointments-web` saliendo de `develop` después de la #89. Se trabaja en `feature/student-appointments-gx6` (worktree `C:\ft-gx6x`), que es la rama de la #89 (`feature/student-context-cards`) más los specs GX. La PR apunta a `feature/student-context-cards` hasta que la #89 entre; antes de abrirla, `git merge origin/develop`.
2. **Ítem del menú vs. "Archivos que toca".** La decisión 2 (Pablo, 09/11) pone "Turnos" en el menú, pero "Archivos" describe una constante `MY_APPOINTMENTS = { path, title, subtitle }` con una ruta suelta en `pages` del router. Manda la decisión: el ítem `{ path: 'turnos', label: 'Turnos', title: 'Mis turnos', icon: CalendarClock, subtitle: 'TURNOS CON TU ENTRENADOR' }` va en `STUDENT_NAV` entre "Historial" y "Mensajes", y la página se cuelga en `elements.turnos` de `roleSection`. Para que la topbar diga "Mis turnos" con el ítem "Turnos", `roleSection` usa `item.title ?? item.label` (campo opcional nuevo; los demás ítems no cambian). El link se exporta como `MY_APPOINTMENTS_PATH = '/alumno/turnos'`, igual que `MY_PROFILE_PATH`.
3. **Ícono.** `Calendar` ya es "Historial"; "Turnos" usa `CalendarClock` (existe en la versión instalada de `lucide-react`). "Ver agenda" usa `Calendar`, como pide el spec.
4. **Rechazos y libres.** La decisión 3 dice que con cualquier rechazo del POST (`SLOT_TAKEN`, `SLOT_UNAVAILABLE`, `APPOINTMENT_LIMIT`, 403) se vuelven a pedir los libres; la sección "Pedir" lo dice solo para `SLOT_TAKEN`/`SLOT_UNAVAILABLE`. Manda la decisión: ante cualquier error del POST el diálogo muestra `error.message` (texto del servidor, o "No hay conexión con el servidor" del cliente) y la página vuelve a pedir **libres y turnos** (los turnos para que el chequeo de 3 pendientes se actualice con un 409). El diálogo queda abierto hasta "Volver".
5. **Etiqueta larga.** "¿Cancelar el turno del jueves 12/11 a las 18:00?" y el `aria-label` "Pedir turno el viernes 06/11 a las 18:00" usan el día completo en minúscula; `shortDayHourLabel` de `cells.js` abrevia ("jue 12/11 a las 18:00"). Se suma `dayAtLabel(iso)` → `'jueves 12/11 a las 18:00'` a `studentAgenda.js`.
6. **`pendingAhead` cuenta solo la lista (hoy..hoy + 59).** El backend (`countFuturePending`) cuenta todos los pendientes a futuro sin tope. Es equivalente: el alumno solo pide hasta + 28 días y lo que agenda el PT nace `confirmed`. El backend sigue decidiendo (decisión 5).
7. **Libres hoy..hoy + 27.** `GET /availability/free` acepta 31 días y para el alumno corta en `now + 28 días` (`studentHorizonMs`). Con hoy + 27 (fecha argentina) nunca se pide un día que el backend vacíe entero.
8. **"Hoy" de la página.** Los rangos salen de `useToday()` (como Hoy) para que una pestaña abierta de un día para otro pida el rango nuevo; "ya pasó" y `canCancel` usan el reloj (`new Date()`) en cada render, como `NextAppointmentCard`.
9. **Doble click.** Desde B7 todos los diálogos que mandan algo usan `useSubmitLock` (`docs/proceso/pruebas-web.md`). Los dos diálogos nuevos también, con su test.
10. **JSDoc de la API.** Además del de `useCreateAppointment` (spec), el de `createAppointment` en `api/agenda/agenda.api.js` también dice que es del entrenador; se corrigen los dos.
11. **Carpetas.** `components/agenda` queda con 10 entradas (8 archivos + `dialogs/` + `student/`); `utils/agenda` con 8; `tests/pages/student` con 8; `tests/helpers/agenda` con 2. Los componentes se prueban por la página (como `TodayPage`), según la lista de tests del spec.
12. **Conteos de partida:** `routeTable.js` 90, `router.jsx` 112, `NextAppointmentCard.jsx` 44, `useAgenda.js` 69, `TodayPage/context.test.jsx` 96, `routeTable.test.js` 64, `router.test.jsx` < 200 (se suma una fila al `it.each`).

## Global Constraints

- Ningún archivo de código pasa de **200 líneas** (tests incluidos); carpetas de hasta 10 archivos; capa → módulo → archivo; los tests copian el árbol de `src`; utilidades de test en `tests/helpers/agenda/`.
- Commits Conventional en español, **sin** `Co-Authored-By` ni "Generated with". Sin `--no-verify`. No se commitean `.agents/`, `.claude/`, `skills-lock.json`.
- Sin cambios de backend, contrato ni schema. Solo horarios del servidor: `scheduled_at` = el `starts_at` recibido, nunca calculado.
- Rangos: turnos `from = hoy`, `to = hoy + 59`; libres `from = hoy`, `to = hoy + 27` (`YYYY-MM-DD`, fecha argentina, `nextDaysRange(now, 60)` y `nextDaysRange(now, 28)`). Horas en hora argentina (UTC-3).
- `MAX_PENDING = 3`. Nota hasta **500** caracteres, contador `"N/500"`; `notes` se omite si queda vacía (recortada).
- Copys (voseo, exactos): "Mis turnos", "TURNOS CON TU ENTRENADOR", "Turnos" (menú), "Tus turnos", "Pedir turno", "Cancelar", "Ya pasó", "Turno pedido: tu entrenador lo tiene que confirmar.", "No tenés turnos. Pedí uno con tu entrenador.", "Cargando tus turnos…", "No pudimos cargar tus turnos.", "¿Cancelar el turno del jueves 12/11 a las 18:00?", "Sí, cancelar", "Volver", "Podés tener hasta 3 turnos pendientes.", "Tu entrenador no tiene horarios libres en las próximas 4 semanas.", "Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme.", "Cargando los horarios libres…", "No pudimos cargar los horarios libres.", "Nota (opcional)", "Ver agenda".
- Cabecera de día de los libres: mono `"VIE 06/11"` (`WEEKDAYS_SHORT`); chip `"18:00"`, `min-h-11` (44 px), `aria-label` `"Pedir turno el viernes 06/11 a las 18:00"`.
- Cancelados al final con `opacity-60`, sin toggle. Estado con punto y color de `STATUS_STYLES`. Nota en `text-ink6 line-clamp-2`.
- No tocar: `useAuthStore.js`, `AgendaPage.jsx`, `components/agenda/dialogs/*`, `chat`, `trainer-ai`, backend.

## Review Focus

1. **Doble click en "Pedir turno" o "Sí, cancelar"** → un solo POST/PATCH (`useSubmitLock`). Tests en Tasks 3 y 4.
2. **Turno de hoy que ya pasó, pendiente o confirmado** → "Ya pasó" sin botón Cancelar (el PATCH daría `APPOINTMENT_PAST`). Test en Task 1 (`canCancel`) y Task 2 (fila).
3. **Sin red al pedir** → el diálogo muestra "No hay conexión con el servidor", queda abierto y el botón se puede volver a usar. Test en Task 4.
4. **Slot de las 23:00 de Argentina (02:00Z del día siguiente)** → aparece bajo el día argentino, no el UTC. Test en Task 1 (`groupFreeSlots`).
5. **El 409 `APPOINTMENT_LIMIT` aunque la lista muestre menos de 3** (pendientes pedidos desde el celular en otra pestaña) → texto del servidor y, al volver a pedir los turnos, chips deshabilitados con el motivo. Test en Task 4.

---

Comandos (desde `C:\ft-gx6x\frontend`):
- Tests: `npx vitest run <path>`
- Lint (incluye las 200 líneas): `npm run lint`

### Task 1: Utilidades de la agenda del alumno

**Files:**
- Create: `frontend/src/utils/agenda/studentAgenda.js`
- Test: `frontend/tests/utils/agenda/studentAgenda.test.js`

**Interfaces:**
- Consumes: `arParts`, `dayMonth`, `WEEKDAYS_LONG`, `WEEKDAYS_SHORT` de `utils/agenda/time.js`; `pad` de `utils/dates`.
- Produces:
  - `MAX_PENDING = 3`
  - `sortForStudent(list) → Appointment[]`: pending/confirmed por `scheduled_at` ascendente, después los cancelados por fecha. No muta.
  - `groupFreeSlots(slots: {starts_at}[]) → { date: 'YYYY-MM-DD', label: 'VIE 06/11', slots: { starts_at, time: '18:00' }[] }[]`, días en orden y horas en orden.
  - `pendingAhead(list, now: Date) → number`: `pending` con `scheduled_at > now`.
  - `canCancel(appt, now: Date) → boolean`: `pending`/`confirmed` y `scheduled_at > now`.
  - `dayAtLabel(iso) → 'jueves 12/11 a las 18:00'`.

- [ ] **Step 1: Tests que fallan** (`freezeNow`/`NOW` y `appt` de `tests/helpers/agenda/fixtures.js`):
  - `sortForStudent([cancelado 05/11, confirmado 10/11, pendiente 06/11])` → ids `[pendiente, confirmado, cancelado]`; el array original no cambia.
  - `groupFreeSlots([{ starts_at: '2026-11-07T02:00:00.000Z' }, { starts_at: '2026-11-06T21:00:00.000Z' }, { starts_at: '2026-11-09T12:00:00.000Z' }])` → `[{ date: '2026-11-06', label: 'VIE 06/11', slots: [18:00, 23:00] }, { date: '2026-11-09', label: 'LUN 09/11', slots: [09:00] }]`.
  - `pendingAhead` con un pendiente pasado, uno futuro, un confirmado futuro y un cancelado futuro → `1`.
  - `canCancel`: pendiente futuro `true`; confirmado futuro `true`; cancelado futuro `false`; pendiente a la hora exacta de `now` `false`.
  - `dayAtLabel('2026-11-12T21:00:00.000Z')` → `'jueves 12/11 a las 18:00'`.
- [ ] **Step 2: Correr** `npx vitest run tests/utils/agenda/studentAgenda.test.js` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementar** las funciones con las firmas de arriba.
- [ ] **Step 4: Correr** el test → PASS; `npm run lint` → OK.
- [ ] **Step 5: Commit** `feat(web): utilidades de la agenda del alumno (orden, libres por día, pendientes)`

### Task 2: Ruta, ítem "Turnos" y lista de turnos

**Files:**
- Create: `frontend/src/pages/student/MyAppointmentsPage.jsx`, `frontend/src/components/agenda/student/AppointmentList.jsx`, `frontend/src/components/agenda/student/AppointmentRow.jsx`, `frontend/tests/helpers/agenda/student.js`
- Modify: `frontend/src/routes/routeTable.js`, `frontend/src/routes/router.jsx`
- Test: `frontend/tests/pages/student/MyAppointmentsPage/list.test.jsx`, `frontend/tests/routes/routeTable.test.js`, `frontend/tests/routes/router.test.jsx`

**Interfaces:**
- Consumes: Task 1; `useAppointments`; `nextDaysRange`, `nextAppointmentLabel` de `utils/agenda/nextAppointment.js`; `useToday`.
- Produces:
  - `MY_APPOINTMENTS_PATH = '/alumno/turnos'`; ítem `turnos` en `STUDENT_NAV`; `roleSection` usa `item.title ?? item.label`.
  - `AppointmentList({ query, notice, onCancel(appt) })` y `AppointmentRow({ appointment, onCancel })`.
  - Helper `stubStudentAgenda({ appointments = [], free = [], create, cancel }) → fetchMock` y `openMyAppointments(options) → { fetchMock, ...renderRoute }`: GET `/appointments?…` devuelve la lista viva (el POST por defecto agrega `appt({ id: 'new', status: 'pending', ... })` y el PATCH por defecto la pasa a `cancelled`); `create(body)`/`cancel(id, body)` pueden devolver un `Response` de error. `free` y `appointments` aceptan también un status o una función, como `reply`.

- [ ] **Step 1: Tests que fallan.**
  - `routeTable.test.js`: labels `['Hoy', 'Mi progreso', 'Mis rutinas', 'Historial', 'Turnos', 'Mensajes', 'Mi perfil']`, paths con `'turnos'`, `MY_APPOINTMENTS_PATH === '/alumno/turnos'` y en `menuLinks`.
  - `router.test.jsx`: fila `['/alumno/turnos', 'Mis turnos', 'Tus turnos']` del `it.each` (el `h1` es "Mis turnos" y el link del menú "Turnos" queda marcado).
  - `list.test.jsx` (`signInStudent(new Date(NOW))`, miércoles 04/11 12:00):
    - pide `/appointments?from=2026-11-04&to=2027-01-02`;
    - una fila muestra "Viernes 06/11 · 18:00", "Pendiente" y la nota; botón "Cancelar";
    - el cancelado va último y su fila tiene `opacity-60`, sin botón;
    - un confirmado de hoy a las 10:00 (ya pasó) muestra "Ya pasó" y no "Cancelar";
    - vacío: "No tenés turnos. Pedí uno con tu entrenador.";
    - error 500: "No pudimos cargar tus turnos." y Reintentar trae la lista.
- [ ] **Step 2: Correr** los tres archivos → FAIL.
- [ ] **Step 3: Implementar** ruta + ítem, la página (dos columnas `lg:grid-cols-[1.2fr_1fr]`, lista primero) y la lista: cada fila es un `<li>`; estados con `LoadingState rows={3} label="Cargando tus turnos…"` y `ErrorState`. El aviso (`notice`) va arriba de la lista con `role="status"`.
- [ ] **Step 4: Correr** → PASS; `npm run lint` → OK.
- [ ] **Step 5: Commit** `feat(web): página Mis turnos del alumno con su lista e ítem Turnos en el menú`

### Task 3: Cancelar un turno

**Files:**
- Create: `frontend/src/components/agenda/student/CancelAppointmentDialog.jsx`
- Modify: `frontend/src/pages/student/MyAppointmentsPage.jsx`
- Test: `frontend/tests/pages/student/MyAppointmentsPage/cancel.test.jsx`

**Interfaces:**
- Consumes: `useUpdateAppointmentStatus`, `useSubmitLock`, `dayAtLabel`.
- Produces: `CancelAppointmentDialog({ appointment | null, onClose, onRejected })`.

- [ ] **Step 1: Tests que fallan:**
  - "Cancelar" abre el diálogo con "¿Cancelar el turno del viernes 06/11 a las 18:00?"; "Volver" lo cierra sin PATCH;
  - "Sí, cancelar" manda `PATCH /appointments/a-1` con `{ status: 'cancelled' }`, cierra el diálogo y la fila pasa a "Cancelado", al final;
  - 409 `APPOINTMENT_PAST` "El turno ya pasó": el texto inline (`role="alert"`), el diálogo sigue abierto y se vuelve a pedir `/appointments`;
  - doble click rápido en "Sí, cancelar" → un solo PATCH.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar.** `Dialog` con `dismissible={!pending}`; botones "Volver" (ghost) y "Sí, cancelar" (`danger`, `loading`). En error: `setError(error.message)` y `onRejected()` (la página hace `appointments.refetch()`).
- [ ] **Step 4: Correr** → PASS; lint OK.
- [ ] **Step 5: Commit** `feat(web): el alumno cancela sus turnos con confirmación`

### Task 4: Horarios libres y pedir turno

**Files:**
- Create: `frontend/src/components/agenda/student/FreeSlotsCard.jsx`, `frontend/src/components/agenda/student/RequestAppointmentDialog.jsx`
- Modify: `frontend/src/pages/student/MyAppointmentsPage.jsx`, `frontend/src/hooks/agenda/useAgenda.js` (JSDoc), `frontend/src/api/agenda/agenda.api.js` (JSDoc)
- Test: `frontend/tests/pages/student/MyAppointmentsPage/request.test.jsx` (diálogo y POST) y `frontend/tests/pages/student/MyAppointmentsPage/slots.test.jsx` (libres, estados y tope), separados por tema

**Interfaces:**
- Consumes: `useFreeSlots`, `useCreateAppointment`, `useSubmitLock`, Task 1.
- Produces: `FreeSlotsCard({ query, limitReached, onPick(starts_at) })`, `RequestAppointmentDialog({ startsAt | null, onClose, onCreated, onRejected })`.

- [ ] **Step 1: Tests que fallan:**
  - pide `/availability/free?from=2026-11-04&to=2026-12-01`; muestra "Podés tener hasta 3 turnos pendientes.", la cabecera "VIE 06/11" y el chip "18:00" con nombre "Pedir turno el viernes 06/11 a las 18:00";
  - el chip abre "Pedir turno" con "Viernes 06/11 · 18:00";
  - la nota se corta en 500 (`maxLength`) y el contador pasa de "0/500" a "120/500";
  - el POST lleva `{ scheduled_at: '2026-11-06T21:00:00.000Z' }` sin `notes` con la nota vacía (o solo espacios), y `notes` recortada si hay texto;
  - al salir bien se cierra, aparece "Turno pedido: tu entrenador lo tiene que confirmar." y el turno nuevo en la lista;
  - 409 `SLOT_TAKEN` "Ese horario ya está ocupado": texto inline, se vuelve a pedir `/availability/free`, "Volver" cierra;
  - sin red (`fetch` rechaza): "No hay conexión con el servidor" y el botón habilitado;
  - con 3 pendientes a futuro: chips deshabilitados y "Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme.";
  - 409 `APPOINTMENT_LIMIT` con 2 en la lista (la siguiente lectura trae 3): texto del servidor y, al cerrar, los chips deshabilitados;
  - vacío: "Tu entrenador no tiene horarios libres en las próximas 4 semanas."; error 500: "No pudimos cargar los horarios libres." con su Reintentar;
  - doble click en "Pedir turno" → un solo POST.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar.** Chips `Button variant="ghost" size="sm"` con `min-h-11`; el motivo del límite con `id` y `aria-describedby` en los chips. Diálogo: título "Pedir turno", `nextAppointmentLabel(startsAt)` en `font-display text-2xl`, `Textarea` con `maxLength={500}` y `hint` = contador; botones "Volver" y "Pedir turno" (`loading`). En error: `error.message` inline + `onRejected()` (la página: `free.refetch()` y `appointments.refetch()`). En éxito: `onCreated()` (la página fija el aviso) y cierra.
- [ ] **Step 4: Correr** → PASS; lint OK.
- [ ] **Step 5: Commit** `feat(web): el alumno pide turno en un horario libre de su entrenador`

### Task 5: "Ver agenda" en el Próximo turno de Hoy

**Files:**
- Modify: `frontend/src/components/student/today/NextAppointmentCard.jsx`
- Test: `frontend/tests/pages/student/TodayPage/context.test.jsx`

**Interfaces:**
- Consumes: `MY_APPOINTMENTS_PATH`.

- [ ] **Step 1: Tests que fallan:** en la tarjeta "Próximo turno" hay un link "Ver agenda" con turno, sin turno y con error (500); mientras carga (respuesta que no resuelve) no está; al tocarlo, `pathname()` es `/alumno/turnos`.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar.** `<Link>` con las clases del `Button` ghost (ancho completo, `mt-3.5`, ícono `Calendar` `aria-hidden`) debajo del contenido salvo en carga; actualizar el comentario "Sin botón…".
- [ ] **Step 4: Correr** → PASS; lint OK.
- [ ] **Step 5: Commit** `feat(web): Ver agenda en el próximo turno de Hoy lleva a Mis turnos`

### Task 6: Documentación

**Files:**
- Modify: `docs/proceso/pruebas-web.md` (fila "Columna de contexto" de A1 Hoy: próximo turno con "Ver agenda" y "Mis turnos" del alumno, GX6).

- [ ] **Step 1:** Editar la fila; el contrato no cambia.
- [ ] **Step 2: Commit** `docs(web): Mis turnos del alumno en el checklist de la Guía Web`
