---
tags: [spec]
tarjeta: E5
---
# Spec — E5 · Progreso del alumno: resumen del mes, asistencia y gráficos (mobile)

- **Tarjeta:** [E5 del tablero del entrenador](https://trello.com/c/63idd71X).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-progreso`, apilada sobre `feature/android-entrenador-historial` (E4). Los gráficos necesitan la tarjeta 13 (PR #44): ver la nota de alcance.
- **Diseño:** `EM_PerfilAlumno`: fila SESIONES / RACHA / PRS y "Asistencia · <mes>" con Entrenó / Faltó / Sin plan. Los gráficos son los del alumno (tarjeta 13).

> **Alcance partido al implementar (01/11):** los gráficos dependen de la tarjeta 13 (PR #44), que sigue abierta con cambios pedidos y no está en develop (y su Room v9 choca con la de develop). Esta tarjeta (E5) entrega el **resumen del mes y la asistencia** (backend `GET /students/:id/attendance`, Room v15 `trainer_attendance`, sección "Progreso" en la ficha con meses anteriores y offline). **"Ver gráficos"** (§4.2: `ProgressSubject`, `student_id`, `trainer_progress_exercises`) pasa a la tarjeta **E5b**, que se hace cuando la #44 entre a develop.
>
> Como quedó: el ownership da **403** para un alumno ajeno (como la ficha, no 404). En la app, la tabla es `trainer_attendance` (PK trainerId, studentId, month) con la racha y los días como JSON; `StudentProgressRepository.refreshMonth` pide asistencia y racha en paralelo y guarda las dos o nada. Un error que no es de red muestra "No pudimos actualizar el progreso." con Reintentar.

## 1. Objetivo

En la ficha, el entrenador ve de un vistazo el mes del alumno (sesiones, racha, récords y un calendario de asistencia) y abre los mismos gráficos de cargas y medidas que ve el alumno.

**Criterio de aceptación:** el entrenador ve en el celular el resumen del mes y la asistencia de un alumno, y la curva de carga de un ejercicio y el peso, iguales a los de la web y a los del alumno.

## 2. Decisiones (debate del 01/11)

- **Endpoint nuevo en el backend** (módulo Students, de Igna) para el resumen y la asistencia, porque el celular no tiene el historial completo:
  - `GET /students/:id/attendance?month=YYYY-MM`;
  - trainer (sus alumnos) o el propio alumno, con el ownership en el service, igual que `GET /students/:id`;
  - `month` es opcional (por defecto, el mes actual en hora argentina) y no puede ser futuro.
- **Días asignados:** salen de las rutinas activas **actuales** (`findAssignedDays`), como la racha (ADR 0005). Si el entrenador cambia la rutina, el calendario de meses anteriores se recalcula con los días nuevos. Es una limitación conocida, la misma que la racha.
- **La racha** se lee de `GET /students/:id/streak`, que ya existe y permite al trainer.
- **Gráficos:** se reusan `ProgressRepository` y las pantallas de la tarjeta 13, pidiendo con `student_id`. La lista de ejercicios entrenados sale de `GET /progress/overview?student_id=` (el alumno la arma desde su historial local, que el entrenador no tiene).
- **Offline:** el resumen, la asistencia y los gráficos ya vistos quedan cacheados y se ven en modo avión.

## 3. Backend: `GET /students/:id/attendance`

```json
{ "data": {
  "month": "2026-11",
  "sessions": 6,
  "assigned_days": 9,
  "prs": 2,
  "days": [ { "date": "2026-11-01", "status": "trained" }, { "date": "2026-11-02", "status": "missed" },
            { "date": "2026-11-03", "status": "rest" }, { "date": "2026-11-20", "status": "upcoming" } ]
} }
```

- **`status` de cada día del mes:**
  - `trained`: tiene al menos una sesión terminada ese día;
  - `missed`: era día asignado, ya pasó (antes de hoy) y no entrenó;
  - `rest`: no era día asignado y no entrenó;
  - `upcoming`: hoy sin entrenar todavía, o un día futuro.
- **Contadores:**
  - `sessions`: sesiones terminadas del mes;
  - `assigned_days`: días asignados del mes hasta hoy inclusive;
  - `prs`: sesiones del mes con al menos un récord, usando la RPC `session_records` que ya existe.
- Todo en hora argentina. La lógica pura va en `backend/src/models/students/attendance.js`, que reusa `addDays` y `weekdayOf`.
- Contrato y `backend/README.md` (la web puede usarlo) se actualizan en la misma PR.

## 4. Mobile

### 4.1 Ficha (E3) suma la sección "Progreso"

- Fila de tres números: SESIONES "6/9" (sesiones / días asignados hasta hoy), RACHA (en coral si es > 0) y PRS.
- Calendario "Asistencia · noviembre":
  - grilla de 7 columnas que empieza el lunes;
  - celdas en azul = entrenó, en coral = faltó, sin color = sin plan, y atenuadas las que vienen;
  - leyenda "Entrenó · Faltó · Sin plan";
  - flechas para ir a meses anteriores (solo con red, salvo los ya cacheados).
- "Ver gráficos" abre la pantalla de gráficos del alumno (`trainer/students/{id}/progress`).

### 4.2 Gráficos

- **`ProgressApi`:**
  - `exercise(id, studentId: String?)`: suma la query `student_id`;
  - `overview(studentId)`: nuevo, `GET progress/overview`.
- **Clave del caché de progreso:** para el entrenador es `"<trainerId>:<studentId>"`, en las mismas tablas `progress_*` y sin migrarlas; para el alumno sigue siendo su id. `clearUserData(trainerId)` borra también las claves `"<trainerId>:%"`.
- **Ejercicios entrenados del alumno:** tabla nueva `trainer_progress_exercises` (`key, exerciseId, name, lastTrainedAt`), alimentada por `overview`.
- **`ChartsScreen`/`ChartsViewModel`:** reciben un `ProgressSubject`:
  - `Self(ownerId)` para el alumno, que hoy funciona igual;
  - `Student(trainerId, studentId)` para el entrenador, que usa la lista de `trainer_progress_exercises` y pasa `student_id`.

### 4.3 Resumen y asistencia

- Tabla `trainer_attendance` (`trainerId, studentId, month, sessions, assignedDays, prs, daysJson, fetchedAt`) y `streak` en la misma fila.
- **`StudentProgressRepository`** en `data/students/progress/`:
  - `observeMonth(trainerId, studentId, month)`;
  - `refreshMonth(...)`: pide asistencia y racha en paralelo; si falla, conserva el caché.

## 5. Pruebas

- **Backend:**
  - `attendance.js`: mes completo pasado, mes actual con hoy entrenado y sin entrenar, día asignado faltado, sesión no terminada, febrero y bisiesto;
  - service: alumno ajeno → 404, mes futuro → 400;
  - validación de `month`.
- **Mobile:**
  - grilla del calendario: primer día del mes en domingo, meses de 28, 30 y 31 días;
  - textos;
  - repositorio: refresh, error que conserva el caché, clave del trainer;
  - `ProgressRepository` con `Student`: manda `student_id` y no pisa el caché del alumno;
  - borrado por prefijo;
  - migración (androidTest).
- **E2E:** como `profe.card8`, ficha del alumno al día: resumen, calendario de noviembre y del mes anterior, gráfico de un ejercicio y de peso. En modo avión, lo ya visto se sigue viendo.

## 6. Fuera de alcance

Volumen semanal (la web lo tiene; si sobra tiempo se suma). Asistencia histórica con las rutinas viejas.
