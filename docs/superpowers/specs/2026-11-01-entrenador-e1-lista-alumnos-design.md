---
tags: [spec]
tarjeta: E1
---
# Spec — E1 · Lista de alumnos del entrenador (mobile)

- **Tarjeta:** [E1 del tablero del entrenador](https://trello.com/c/IHkkxiBo).
- **Fecha:** 2026-11-01 (debate con Igna del mismo día).
- **Rama:** `feature/android-entrenador-alumnos`, sobre `develop` (que ya tiene la #51). La PR apunta a `develop`. Room v12 desde la 9, dejando la 10 y la 11 para la #44 y la #48 (ver Task 0 del plan).
- **Reglas:** `AGENTS.md` (Room es la única fuente de verdad; capas del backend; ownership en services) y `CONTRIBUTING.md` (200 líneas, capa → módulo → archivo, carpetas de más de 10 archivos se subdividen).
- **Diseño:** prototipo `EM_Alumnos` en `docs/design/prototype-src/ent-mobile.jsx`. Tema oscuro, azul `#2952D9`, toque mínimo 44 px.

## 1. Objetivo

La pestaña **Alumnos** del entrenador hoy dice "PRÓXIMAMENTE". Pasa a ser la lista de sus alumnos, con su estado, último entreno y adherencia, también sin conexión.

**Criterio de aceptación:** el entrenador entra a Alumnos, ve a sus alumnos con su último entreno y su adherencia, filtra y busca; en modo avión sigue viendo la lista.

## 2. Decisiones (debate del 01/11)

- **Estados** (los mismos que la web, `frontend/src/utils/students/activity.js`):
  - `disabled`: dado de baja (`active = false`).
  - `inactive` ("en riesgo"): 7 días o más sin entrenar, contando desde la última sesión o, si nunca entrenó, desde el alta.
  - `new` ("nuevo"): nunca entrenó y tiene menos de 7 días de alta.
  - `active` ("al día"): el resto.
  - Los días son de calendario en hora argentina.
- **Filtros:** Todos (activos, sin dados de baja) · Al día · En riesgo · Nuevos (nunca entrenó, cualquier antigüedad) · Dados de baja.
- **Búsqueda** por nombre, local sobre lo cacheado (sin distinguir mayúsculas ni tildes).
- **Adherencia de 7 días:** días asignados por la rutina activa en los 7 días completos anteriores a hoy (de ayer hacia atrás) en los que el alumno tuvo al menos una sesión terminada, sobre esos días asignados. Sin días asignados → `null` (la fila muestra "Sin plan"). Es la misma noción de "días asignados" que la racha (ADR 0005). La calcula el backend.
- **Offline:** solo lectura. La lista se cachea en Room y se ve en modo avión con "Actualizado hace X". El refresco es al entrar y con pull-to-refresh.
- **El botón "+"** (invitar) aparece recién con E2. **Tocar un alumno** abre su ficha recién con E3; hasta entonces la fila no es tocable.

## 3. Backend: `GET /students` suma dos campos

Cambio compatible en el módulo Students (de Igna). Cada alumno del listado suma:

```json
"days_per_week": 4,
"adherence_7d": { "assigned": 4, "done": 3, "pct": 75 }
```

- `days_per_week`: cantidad de días distintos de las rutinas activas del alumno; `0` si no tiene.
- `adherence_7d`:
  - `assigned`: días asignados entre `hoy-7` y `hoy-1`.
  - `done`: de esos, cuántos tienen al menos una sesión **terminada** (`finished_at` no nulo, fecha de `started_at` en hora argentina).
  - `pct`: `round(done * 100 / assigned)`, o `null` si `assigned = 0`.
- Se calcula para la página pedida, con una consulta de rutinas activas y una de sesiones para todos los alumnos de la página (sin N+1).
- La lógica pura va en `backend/src/models/students/adherence.js` y reusa `addDays` y `weekdayOf` de `models/gamification/streak.js` y `localDate` de `shared/utils/dates.js`.
- Contrato (`docs/arquitectura/contratos-api.md`, `GET /students`) y `backend/README.md` (aviso: campo nuevo, la web puede mostrar la adherencia) se actualizan en la misma PR.

## 4. Mobile

### 4.1 Datos

- **API:** `StudentsApi.list(active: Boolean, page: Int, limit = 100)`. El repositorio pide todas las páginas (activos y dados de baja) y reemplaza el caché en una transacción.
- **Room:**
  - tabla `trainer_students` (dueño = id del entrenador logueado): `id, trainerId, name, email, goal, active, avatarUrl, createdAt, lastSessionAt, daysPerWeek, adherenceAssigned, adherenceDone, adherencePct`;
  - tabla `trainer_students_sync` (`trainerId, lastSyncedAt`);
  - migración automática a la versión siguiente de la cadena, con su test de migración.
- **Repositorio:** `TrainerStudentsRepository` en `data/students/`, con el patrón de `LibraryRepository`:
  - `observe(trainerId)`: Flow del caché;
  - `refresh(trainerId)`: devuelve `Result`, y si falla deja el caché como estaba;
  - implementa `UserDataCleaner`, así el logout borra lo del entrenador.
- **Reglas puras** en `data/students/StudentStatus.kt`: `statusOf(student, today)`, `daysWithoutTraining`, `matchesFilter`, `matchesQuery`. Fecha argentina inyectada por `Clock`.

### 4.2 Pantalla

`ui/students/`: `StudentsScreen`, `StudentsViewModel`, `StudentsUiState`, `StudentsTexts` y `components/` (`StudentRow`, `StudentFilters`, `StudentAvatar`).

- **Cabecera:**
  - arriba, "N ACTIVOS · M EN RIESGO";
  - título "Alumnos";
  - buscador "Buscar alumno…";
  - chips de filtros.
- **Fila:**
  - avatar con iniciales (rojo si está en riesgo);
  - nombre;
  - "Objetivo · N d" (sin días: solo el objetivo);
  - barra de adherencia con el %: verde ≥ 70, azul ≥ 50, rojo < 50; "Sin plan" si es `null`;
  - a la derecha, la píldora de estado y el último entreno: "Hoy", "Ayer", "Hace N días" o "Nunca entrenó".
- **Orden:** en riesgo primero, después por último entreno más reciente y después por nombre.
- **Estados de pantalla:**
  - cargando la primera vez;
  - vacío sin alumnos ("Todavía no tenés alumnos");
  - vacío por filtro o búsqueda;
  - error de red con caché: aviso arriba y la lista igual;
  - error sin caché: pantalla de error con "Reintentar".
- **Navegación:** la pestaña `trainer/students` de `RoleShell` muestra `StudentsScreen`.

## 5. Pruebas

- **Backend (Jest):**
  - `adherence.js`: sin días asignados, todos cumplidos, parcial, sesión no terminada que no cuenta, sesión de hoy que no cuenta, cambio de mes;
  - repositorio: consultas por lote;
  - service `list`: suma los campos y deja `pct` en `null` sin plan.
- **Mobile (JUnit):**
  - `StudentStatus`: los cuatro estados, borde de 7 días, nunca entrenó con 6 y 7 días de alta;
  - filtros y búsqueda con tildes;
  - repositorio: refresh con páginas, error que conserva el caché, borrado del dueño;
  - ViewModel: filtro, búsqueda, contador y orden;
  - textos;
  - migración (androidTest).
- **E2E en el emulador** con `profe.card8` y los alumnos de prueba (ver §6): los cuatro estados, filtros, búsqueda y modo avión.

## 6. Datos de prueba (autorizado por Igna)

Se crean por la API real 4 alumnos de `profe.card8`, con emails `*.e2e@test.com` y contraseña `Prueba1234`:
- uno al día, con rutina de 3 días y sesiones recientes;
- uno en riesgo, con la última sesión hace 10 días;
- uno nuevo, sin sesiones;
- uno dado de baja.

Las sesiones pasadas se cargan con `POST /sessions` y `POST /sessions/:id/sets` con fechas pasadas. No se toca nada de lo que ya existe.

## 7. Fuera de alcance

Invitar (E2), ficha (E3), adherencia en la web (queda el aviso a Pablo).
