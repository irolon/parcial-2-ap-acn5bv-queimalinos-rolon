---
tags: [spec, tarjeta-46]
---

# Agenda: disponibilidad, turnos y calendario semanal del PT — diseño

Tarjeta de equipo **46** ([Trello](https://trello.com/c/9cD3zURO)) · MIS TAREAS 21 · RF PT-11 / AL-12 · HU-23 · CU-26 (nuevo).

## 1. Objetivo y criterio de aceptación

El PT carga su disponibilidad semanal, ve sus turnos en un calendario semanal y confirma o cancela las solicitudes de sus alumnos. Cada cambio de estado le avisa al alumno con push.

**Criterio:** el PT carga su disponibilidad, ve la semana con dos turnos pendientes, confirma uno y cancela otro, y el alumno recibe el push. Si llegan dos solicitudes para el mismo horario, la segunda se rechaza.

## 2. Decisiones (grilling 31/10)

| # | Decisión |
|---|----------|
| Q1 | Se hace: las P1 propias ya están hechas o en review. |
| Q2 | Backend completo, incluidos los endpoints del alumno (franjas libres, pedir y cancelar), y la web del PT. La pantalla del alumno es para mobile (Igna) y usa este backend. En el E2E las solicitudes se crean por API. |
| Q3 | Tabla nueva `trainer_availability`: franjas semanales por día (1 = lunes … 7 = domingo) con `start_time` y `end_time` en hora de Argentina; puede haber varias por día. Los turnos duran **60 min** y empiezan en hora en punto. Sin feriados ni excepciones. Cambiar la disponibilidad no cancela turnos existentes. |
| Q4 | Solapamiento: **índice único parcial** `(trainer_id, scheduled_at) where status <> 'cancelled'`. La segunda solicitud falla en la base aunque llegue al mismo tiempo y el backend responde **409 `SLOT_TAKEN`**. El backend valida además hora en punto, futuro y disponibilidad. |
| Q5 | El alumno pide en una franja libre de las próximas **4 semanas** (queda `pending`) y puede cancelar los suyos. El PT confirma o cancela pendientes, cancela confirmados y crea turnos manuales para sus alumnos, que quedan `confirmed`. Nada se borra: cancelar libera la franja. |
| Q6 | Push al alumno cuando el PT confirma, cancela o crea un turno manual. Al PT, solo una fila en `notifications` (sin push) cuando un alumno pide o cancela. Los textos llevan día y hora de Argentina. |
| Q7 | Calendario web lun–dom, con semana anterior / Hoy / semana siguiente. Horas desde la primera hasta la última de la disponibilidad (08–21 si no hay ninguna) y franjas disponibles sombreadas. Colores: pending `warn`, confirmed `good`, cancelled gris tachado (oculto salvo con "Mostrar cancelados"). Tocar un turno abre un panel con Confirmar y Cancelar (Cancelar pide confirmación). Debajo de 768 px se ve una lista por día. |
| Q8 | Diálogo "Disponibilidad" con los 7 días: agregar o quitar franjas "desde–hasta" en horas en punto, sin solaparse. Se guarda todo junto (`PUT`). |
| Q9 | Se detalla **CU-26 "Gestionar agenda (web)"** en `casos-de-uso.md` y el diagrama apunta ahí. CU-19 ("Solicitar turno") queda para mobile. |

## 3. Datos

Migración `backend/src/database/migrations/2026-10-31-agenda.sql` (re-ejecutable). También va en `schema/06-ai-and-agenda.sql`, en `07-rls.sql` y en `checks/schema-checks.sql`.

```sql
create table if not exists trainer_availability (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references trainers (id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),   -- 1 = lunes (ISO)
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  constraint availability_range check (start_time < end_time),
  constraint availability_on_the_hour check (extract(minute from start_time) = 0 and extract(second from start_time) = 0
                                                  and extract(minute from end_time) = 0 and extract(second from end_time) = 0)
);
create unique index if not exists uq_availability_slot on trainer_availability (trainer_id, weekday, start_time);
alter table trainer_availability enable row level security;

create unique index if not exists uq_appointments_trainer_slot
  on appointments (trainer_id, scheduled_at) where status <> 'cancelled';

-- Reemplazo atómico de la disponibilidad (supabase-js no tiene transacciones).
create or replace function replace_trainer_availability(p_trainer uuid, p_slots jsonb)
returns setof trainer_availability language plpgsql security invoker set search_path = public as $$
begin
  delete from trainer_availability where trainer_id = p_trainer;
  insert into trainer_availability (trainer_id, weekday, start_time, end_time)
  select p_trainer, (s->>'weekday')::smallint, (s->>'start_time')::time, (s->>'end_time')::time
  from jsonb_array_elements(p_slots) s;
  return query select * from trainer_availability where trainer_id = p_trainer order by weekday, start_time;
end $$;
revoke all on function replace_trainer_availability(uuid, jsonb) from public, anon, authenticated;
grant execute on function replace_trainer_availability(uuid, jsonb) to service_role;
```

- `appointments` no cambia de forma: `duration_min` queda en 60, que es lo que crea el backend.
- Las horas de `trainer_availability` son de Argentina (UTC-3 fijo, sin horario de verano). `scheduled_at` es `timestamptz` (UTC). La conversión usa un offset fijo UTC-3 (Argentina no tiene horario de verano), verificado contra Intl en los tests.

## 4. API

Todas las rutas usan `authenticate`.

**Disponibilidad (`/api/availability`):**

| Método y ruta | Rol | Qué hace |
|---|---|---|
| `GET /availability` | trainer | `{ data: [{ weekday, start_time: 'HH:MM', end_time: 'HH:MM' }] }`, ordenado. |
| `PUT /availability` | trainer | Body `{ slots: [...] }` (0–50). Valida weekday 1–7, horas en punto `HH:00`, inicio < fin y que no haya franjas solapadas el mismo día (400 con detalle). Reemplaza todo con la RPC. Devuelve lo guardado. |
| `GET /availability/free?from=YYYY-MM-DD&to=YYYY-MM-DD` | ambos | Franjas libres de 60 min: para el alumno, de su PT; para el PT, las suyas. Rango de 1 a 31 días, solo futuro (desde la próxima hora en punto). Para el alumno, el tope es hoy + 28 días. `{ data: [{ starts_at: ISO }] }`. Libre significa dentro de la disponibilidad y sin turno `pending` ni `confirmed` en ese horario. |

**Turnos (`/api/appointments`):**

Turno público: `{ id, trainer_id, student: { id, name, avatar_url }, scheduled_at, duration_min, status, notes, created_at }`.

| Método y ruta | Rol | Qué hace |
|---|---|---|
| `GET /appointments?from=&to=` | ambos | Fechas `YYYY-MM-DD` en Argentina, rango de 1 a 62 días. El PT ve los suyos y el alumno los suyos, todos los estados, ordenados por `scheduled_at`. |
| `POST /appointments` | student | `{ scheduled_at, notes? }` (nota de hasta 500 caracteres). Tiene que estar en hora en punto, ser futuro, caer a ≤ 28 días y dentro de la disponibilidad del PT; si no, 400 `SLOT_UNAVAILABLE`. Crea `pending`. Si el horario está ocupado, 409 `SLOT_TAKEN` (el 23505 del índice se traduce). Notifica al PT sin push. 201. |
| `POST /appointments` | trainer | `{ student_id, scheduled_at, notes? }`. El alumno tiene que ser suyo y activo (si no, 403). Hora en punto y futuro (si no, 400 `SLOT_UNAVAILABLE`). **No** exige disponibilidad: el PT decide. Crea `confirmed`. Si está ocupado, 409 `SLOT_TAKEN`. Push al alumno. 201. |
| `PATCH /appointments/:id` | ambos | `{ status: 'confirmed' \| 'cancelled' }`. El turno tiene que ser del PT o del alumno (si no, 403). Transiciones: el PT pasa `pending` a `confirmed` y `pending` o `confirmed` a `cancelled`; el alumno pasa `pending` o `confirmed` a `cancelled`. Cualquier otra da 409 `INVALID_STATUS_TRANSITION`. Un turno pasado no se cambia: 409 `APPOINTMENT_PAST`. Notifica a la otra parte según Q6. |

**Notificaciones:**
- `push-policy`: `appointment: { student: true }`.
- `texts.appointmentConfirmed`, `appointmentCancelled`, `appointmentCreatedByTrainer`, `appointmentRequested` y `appointmentCancelledByStudent`. Ejemplos: "Tu turno del vie 06/11 a las 18:00 quedó confirmado" y "Lucía pidió un turno para el vie 06/11 a las 18:00".
- Los disparadores van en `triggers.service.js` con `safely`, con `data: { appointment_id }`.

**Capas:** routes, controllers, services, repositories, models y validations en `agenda/`, más utilidades de fecha en `shared/utils/` (o `shared/utils/dates/` si la carpeta pasa de 10). Archivos ≤ 200 líneas.

## 5. Web (`frontend/`)

- El ítem `agenda` del PT deja de ser placeholder y pasa a `AgendaPage`.
- **Encabezado:** "Agenda", con el subtítulo "SEMANA DEL 2 AL 8 NOV". Botones: "‹", "Hoy", "›", "Disponibilidad" (ghost) y "Nuevo turno" (primary).
- **Grilla:**
  - Una columna de horas y 7 días; el día de hoy en `accentText`.
  - Una fila por hora entre la primera y la última de la disponibilidad (08–21 si no hay ninguna).
  - Celdas disponibles con fondo `ink2` y no disponibles con `ink1`.
  - Bloque de turno: el nombre del alumno con borde izquierdo y fondo translúcido del color de su estado (pending `warn`, confirmed `good`, cancelled `ink5` tachado). Debajo, en mono, "PENDIENTE" o "CONFIRMADO".
- **Toggle** "Mostrar cancelados", apagado por defecto. Leyenda de colores.
- **Panel del turno** (`Dialog`):
  - Avatar y nombre del alumno, "Vie 06/11 · 18:00–19:00", estado y nota.
  - Botones según el estado: Confirmar (si está pendiente) y Cancelar turno (si está pendiente o confirmado y no pasó). Cancelar pide confirmación: "¿Cancelar el turno de Lucía del vie 06/11 a las 18:00? Le avisamos."
  - Errores del servidor inline.
- **Nuevo turno** (`Dialog`): select de alumno activo, fecha (`input date`), hora (select con horas en punto de 06 a 22; las de la disponibilidad marcadas "· disponible" y las ocupadas deshabilitadas) y nota opcional. Un 409 muestra "Ese horario ya está ocupado".
- **Disponibilidad** (`Dialog`): una fila por día (Lunes … Domingo) con sus franjas "08:00 – 12:00 ✕" y "+ Agregar franja" (dos selects de hora). Validación en el cliente con los mismos mensajes que el backend. Botón Guardar.
- **Menos de 768 px:** lista de la semana agrupada por día, con turnos tocables; el resto igual.
- **Datos:** React Query con `['appointments', from, to]` y `['availability']`. Las mutaciones invalidan. Sin polling.
- **Fechas:** todo en `America/Argentina/Buenos_Aires` (semana de lunes a domingo, etiquetas "vie 06/11"), con utilidades en `utils/agenda/`.
- **Módulos:** `api/agenda/`, `hooks/agenda/`, `components/agenda/` (subcarpetas si hace falta), `pages/agenda/AgendaPage.jsx`, `utils/agenda/`.

## 6. Fuera de alcance

Pantalla del alumno (mobile, Igna; web en la tarjeta 22), feriados y excepciones, duraciones distintas de 60 min, turnos recurrentes, reprogramar (se cancela y se crea otro), recordatorios antes del turno, videollamada.

## 7. Pruebas

- **Backend:**
  - validaciones (franjas solapadas, horas no en punto, rangos);
  - utilidades de fecha (Argentina a UTC, semana, franjas libres);
  - SLOT_TAKEN traduciendo 23505;
  - transiciones permitidas y prohibidas por rol;
  - turno pasado;
  - acceso ajeno da 403;
  - notificaciones con push solo al alumno;
  - el alumno fuera de la disponibilidad o a más de 28 días da 400.
- **Web:**
  - utilidades de semana y etiquetas en Buenos Aires (incluido el borde de medianoche UTC);
  - grilla con colores por estado y cancelados ocultos;
  - panel con botones según el estado;
  - diálogos de disponibilidad (validación) y de nuevo turno (409);
  - lista mobile.
- **E2E** contra Supabase dev:
  - el PT carga la disponibilidad en la web;
  - dos alumnas piden turno por API y aparecen pendientes en la semana;
  - el PT confirma uno y cancela otro desde el calendario;
  - las notificaciones del alumno quedan con `push_sent`, o el push sale si hay token;
  - dos solicitudes simultáneas al mismo horario: una da 201 y la otra 409.
  
  Las capturas van en `docs/superpowers/specs/assets/46/`.

## 8. Ajustes durante la implementación

- El cambio de estado es optimista: se actualiza solo si el estado sigue siendo el que se leyó; si cambió en el medio, 409.
- El alumno inactivo recibe 403 al pedir un turno y en `/availability/free`; igual puede cancelar los suyos.
- La grilla es una tabla semántica (`table`).
- "Mostrar cancelados" apila los turnos cancelados junto a los demás en la misma celda.
- Las franjas de disponibilidad se editan directamente, sin borrador previo.
- En "Nuevo turno", las horas ocupadas se marcan " · ocupado" (además de deshabilitadas).
- Al cambiar de semana no hay parpadeo: se conserva la semana anterior mientras carga (`keepPreviousData`).
- La RPC `replace_trainer_availability` es `security invoker`.
- La grilla agrega filas fuera de la disponibilidad para mostrar los turnos manuales que caen ahí.
- El panel del turno muestra las iniciales del alumno: `Avatar` no soporta imagen.
- Los módulos de la agenda van en `agenda/` en todas las capas (excepción anotada en CONTRIBUTING.md).

## 9. Resultado del E2E (31/10, contra Supabase dev, por API)

PT QA (`qa.card26…`) con sus alumnas Lucía y Martín QA. Disponibilidad de lunes a viernes, de 08 a 12 y de 17 a 21.

- `PUT /availability` responde 200. Si dos franjas del mismo día se solapan, responde 400 `VALIDATION_ERROR` con el detalle por franja.
- La alumna ve 40 franjas libres en la semana del 2 al 8 de noviembre. La primera es el lunes 02/11 a las 08:00 de Argentina (11:00Z).
- **Dos solicitudes simultáneas al mismo horario** (jue 05/11, 18:00 AR): una responde 201 `pending` y la otra 409 `SLOT_TAKEN`. Las corta el índice único de la base, no el código.
- La segunda alumna pide otro horario (vie 06/11, 09:00): 201 `pending`. Un pedido fuera de la disponibilidad responde 400 `SLOT_UNAVAILABLE`.
- El PT ve los dos pendientes de la semana, confirma uno y cancela el otro. Reconfirmar el cancelado responde 409 `INVALID_STATUS_TRANSITION`.
- Notificaciones:
  - A las alumnas les llegan "Tu turno del jue 05/11 a las 18:00 quedó confirmado" y "Tu turno del vie 06/11 a las 09:00 fue cancelado", con push según la política.
  - Al PT le llegan "… pidió un turno para el …", sin push.
- La franja del turno cancelado vuelve a quedar libre en `/availability/free`.
- **Pendiente:** la verificación visual en el navegador. Hay que cargar la disponibilidad, confirmar y cancelar desde el calendario, ver la vista mobile y sacar las capturas para `assets/46/`. El agente no puede iniciar sesión con la contraseña de QA (modo automático), así que queda para hacerla con Pablo.
