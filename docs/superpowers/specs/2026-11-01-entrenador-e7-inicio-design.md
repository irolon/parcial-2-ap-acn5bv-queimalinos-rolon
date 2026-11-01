---
tags: [spec]
tarjeta: E7
---
# Spec — E7 · Inicio del entrenador (dashboard mobile)

- **Tarjeta:** [E7 del tablero del entrenador](https://trello.com/c/UXXUAdTT).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-inicio`, apilada sobre `feature/android-entrenador-medidas` (E6).
- **Diseño:** prototipo `EM_Inicio`.

> **Cómo quedó (01/11):**
> - `trainer_overview` guarda la respuesta entera como JSON (`dataJson`, PK `trainerId`) en lugar de columnas por KPI más dos JSON: es chica y se reemplaza entera.
> - Después de comentar en E4, el Inicio no se refresca desde `StudentSessionsRepository`: se refresca solo cada vez que la pestaña vuelve a estar visible (`LifecycleStartEffect`), así al volver de comentar el aviso ya no está. Evita acoplar los dos repositorios.
> - La UI va en `ui/students/overview/` (no en `ui/home/`): el Inicio sale del recurso students (`GET /students/overview`) y la organización es por recurso de la API (CONTRIBUTING.md).
> - `sessions_today.done` cuenta, de los alumnos con hoy asignado (`expected`), los que terminaron una sesión hoy por la fecha argentina de `finished_at`; nunca supera a `expected` (revisión de la #58). La adherencia sigue usando `started_at`, con los pisos de alta y rutina de E1.
> - Las reglas de estado del backend quedaron en `models/students/activity.js`, con las mismas reglas que la web y el celular.

## 1. Objetivo

Al abrir la app, el entrenador ve de un vistazo cómo vienen sus alumnos y a quién atender. La pestaña Inicio hoy dice "PRÓXIMAMENTE".

**Criterio de aceptación:** el entrenador abre la app y ve cuántos alumnos entrenaron hoy, la adherencia y quiénes necesitan atención; tocar uno abre su ficha (o la sesión a comentar).

## 2. Decisiones (debate del 01/11): como el prototipo, con endpoint nuevo

### 2.1 Indicadores (KPIs, 2 × 2)

| KPI | Valor | Variación |
|---|---|---|
| ALUMNOS ACTIVOS | alumnos con `active = true` | "+N": dados de alta en los últimos 7 días |
| SESIONES HOY | de los alumnos activos con hoy asignado, los que terminaron al menos una sesión hoy (por `finished_at`) | "de M": alumnos activos con hoy asignado |
| ADHERENCIA | promedio de la adherencia de 7 días de E1 entre los alumnos con días asignados (`null` si nadie tiene plan) | "±N%" contra los 7 días anteriores |
| EN RIESGO | alumnos activos en estado "en riesgo" (7 días o más sin entrenar, como E1) | — |

### 2.2 "REQUIEREN ATENCIÓN" (hasta 10 filas)

- **"riesgo":** cada alumno en riesgo, con "N días sin entrenar" (o "Nunca entrenó · alta hace N días"), de más días a menos.
- **"aviso":** sesiones terminadas en los últimos 7 días sin comentario del entrenador ("Feedback pendiente · <rutina>"), de la más nueva a la más vieja.
- Primero van los de riesgo.

### 2.3 Actividad reciente

Las últimas 10 sesiones terminadas de sus alumnos: nombre, "<rutina> · RPE N" (sin RPE: solo la rutina) y "hace 12 min" / "1 h" / "ayer" / fecha. El punto "en línea" del prototipo no aplica: las sesiones suben recién al terminar.

### 2.4 Navegación y offline

- Tocar una fila de "riesgo" abre la ficha (E3). Tocar "aviso" o una de "actividad" abre el detalle de esa sesión para comentar (E4).
- **Offline:** el último resumen se cachea y se ve con "Actualizado hace X".
- La cabecera muestra la fecha ("DOMINGO · 1 NOV") y "Hola, <nombre>".
- La campana de notificaciones del prototipo queda para E12.

## 3. Backend: `GET /students/overview`

- Solo trainer, sobre sus alumnos. Va en el módulo Students, **antes** de `/:id` en el router.

```json
{ "data": {
  "active_students": { "count": 23, "new_7d": 2 },
  "sessions_today": { "done": 8, "expected": 11 },
  "adherence_7d": { "pct": 87, "delta": 4 },
  "at_risk": 3,
  "attention": [
    { "kind": "inactive", "student_id": "uuid", "name": "Diego Ocampo", "days": 9, "never_trained": false },
    { "kind": "feedback_pending", "student_id": "uuid", "name": "Lucía Méndez", "session_id": "uuid",
      "routine_name": "Push", "finished_at": "ISO" }
  ],
  "recent": [ { "student_id": "uuid", "name": "Tomás Rivera", "session_id": "uuid", "routine_name": "Push día 3",
                "rpe": 8, "finished_at": "ISO" } ]
} }
```

- `adherence_7d.pct` y `delta` son `null` si nadie tiene días asignados. `delta` = pct de los 7 días anteriores a los últimos 7 → resta, redondeada.
- **Consultas por lote:** alumnos activos, rutinas activas (días), sesiones de los últimos 15 días (para las dos ventanas y hoy) y las últimas 10 terminadas con su rutina. Sin N+1.
- **La lógica pura** va en `backend/src/models/students/overview.js`. Reusa `adherence.js` (E1) y las reglas de estado de E1, que se llevan a `models/students/activity.js` (las mismas que la web).
- Contrato y `backend/README.md` se actualizan en la misma PR (la web puede usarlo).

## 4. Mobile

- **Room:**
  - tabla `trainer_overview` (una fila por entrenador): `dataJson` (la respuesta entera de `GET /students/overview`) y `fetchedAt`;
  - migración a la versión siguiente.
- **`TrainerOverviewRepository`** en `data/students/overview/`:
  - `observe(trainerId)`;
  - `refresh(trainerId)`;
  - es parte del `UserDataCleaner`.
- **UI** en `ui/students/overview/`:
  - `TrainerHomeScreen`, ViewModel, UiState y textos;
  - `components/` (`KpiGrid`, `AttentionList`, `RecentActivity`);
  - pull-to-refresh y refresco al volver a la pestaña.
- **Estados:**
  - sin alumnos: "Invitá a tu primer alumno", que lleva a E2;
  - sin red con caché: aviso;
  - error sin caché: pantalla de error con "Reintentar".
- **Navegación:** la pestaña `trainer/home` muestra `TrainerHomeScreen`. Las filas navegan a las rutas de E3 y E4.

## 5. Pruebas

- **Backend:**
  - `overview.js`: KPIs con y sin plan, variación, sesiones de hoy con y sin día asignado, orden y tope de "atención", sesión comentada que no aparece, alumno dado de baja excluido;
  - service y ruta: rol alumno → 403, y `/overview` no se confunde con `/:id`.
- **Mobile:**
  - textos: "hace N min/h", "ayer", ±%, "de M";
  - mapper;
  - repositorio: refresh, error que conserva el caché, dueño;
  - ViewModel: estados;
  - migración (androidTest).
- **E2E:** con `profe.card8` y los alumnos de prueba de E1, ver los cuatro KPIs, el alumno en riesgo, la sesión sin comentar (al abrirla y comentarla en E4 deja de aparecer) y la actividad reciente.

## 6. Fuera de alcance

Campana y notificaciones (E12). Dashboard igual en la web (queda el aviso a Pablo en el README).
