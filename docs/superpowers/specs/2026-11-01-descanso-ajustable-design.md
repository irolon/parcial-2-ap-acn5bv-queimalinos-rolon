---
tags: [spec]
tarjeta: descanso-ajustable
---
# Spec — Descanso ajustable por el alumno y registrado en el historial

- **Tarjeta:** [dwQI3sGR del tablero personal de Igna](https://trello.com/c/dwQI3sGR) (lista S5). Surgió en el E2E de la tarjeta 12 (31/10).
- **Fecha:** 2026-11-01
- **Rama:** `feature/descanso-ajustable`, sale de `develop` (ya trae la sesión activa, la sincronización offline y el historial: PRs #16, #32, #33 y #40). Backend + mobile en la misma rama; la web queda como tarea para Pablo.
- **Reglas que aplican:** `AGENTS.md` (Room es la única fuente de verdad; escrituras offline-first; capas del backend; ownership en los services) y `CONTRIBUTING.md` (200 líneas, capa → módulo → archivo).
- **Contrato:** `docs/arquitectura/contratos-api.md`, módulo Sesiones: `POST /sessions/:id/sets` y `GET /students/:id/sessions/:sessionId`.

## 1. Objetivo

El entrenador propone el descanso de cada ejercicio (`rest_seconds` de la rutina), pero el alumno muchas veces entrena solo y lo tiene que poder cambiar. El descanso que hizo de verdad queda registrado y el entrenador lo ve en el historial.

**Criterio de aceptación:** el alumno cambia el descanso de un ejercicio y entrena; en el historial del celular y en la API que consume la web del entrenador se ve el descanso real de cada serie y que difiere del plan.

## 2. Decisiones tomadas (debate del 01/11)

- **El backend lo hago yo** (el schema es de Igna); Pablo lo revisa en la PR. El cambio de contrato se avisa en `backend/README.md`, en el mismo commit.
- **Descanso real = lo que corrió el timer**: desde que se confirma la serie hasta que el descanso termina, con los ±15″, la pausa (cuenta como descanso) y el "Saltar" incluidos. Lo que el alumno tarda después en la pantalla de la serie no se mide: la app no sabe cuándo arranca la serie, solo cuándo la confirma.
- **El descanso es de la serie que lo dispara** (el descanso que hizo *después* de esa serie). La app ya corre el descanso del ejercicio también después de su última serie, antes de pasar al siguiente: ese también se registra (corrección del 01/11 al implementar: en el debate se había dicho que quedaba nulo, pero el timer corre y es dato real). Queda nula la última serie de la sesión y una serie sin timer (ejercicio con descanso 0).
- **El ajuste vale para ese ejercicio en esa sesión.** No toca la rutina del entrenador ni la próxima sesión.
- **La web del entrenador es de Pablo.** Esta tarjeta entrega el dato en la API y le deja la tarea en el README.

## 3. Backend

### 3.1 Base de datos

Migración `backend/src/database/migrations/2026-11-01-session-sets-rest.sql` (re-ejecutable) y el mismo cambio en `schema/04-progress.sql`:

```sql
alter table session_sets
  add column if not exists rest_seconds int check (rest_seconds >= 0);
```

Nula = sin dato (series viejas, última serie de la sesión, ejercicio sin descanso). `schema-checks.sql` suma la columna.

### 3.2 `POST /sessions/:id/sets`

- `rest_seconds` opcional en cada serie: entero de 0 a 3600, o `null`/ausente → `null`.
- Fuera de rango o no entero → esa serie va a `failed` con `VALIDATION_ERROR` (como el resto de los campos).
- Reenviar una serie ya guardada la actualiza (comportamiento actual de `persistSets`), así que el valor nuevo pisa al anterior.

### 3.3 `GET /students/:id/sessions/:sessionId`

- Cada serie devuelve `rest_seconds` (real, o `null`).
- El `planned` de cada ejercicio suma `rest_seconds` del `routine_exercise` (o `null`).
- Limitación conocida, igual que `sets`/`reps`/`suggested_kg`: el plan es el valor **actual** de la rutina. Si el entrenador lo edita después, el historial compara contra el valor nuevo.

### 3.4 Aviso a Pablo (`backend/README.md`)

Cambio de contrato (campo nuevo, compatible) y la tarea de la web: en el detalle de una sesión, mostrar el descanso de cada serie y marcarlo cuando difiere del plan.

## 4. Mobile

### 4.1 Room v9

- `workout_exercises.restOverrideSeconds` (Int?, nulo = el del entrenador). `restSeconds` sigue siendo la copia del plan.
- `workout_sets.restSeconds` (Int?, el descanso real).
- Migración 8 → 9 con dos `ALTER TABLE ... ADD COLUMN`, con su test de migración.

### 4.2 Ajuste en la pantalla de la serie

- Una fila "Descanso 1:30" con −15″ y +15″ (toque mínimo 44 px), arriba del CTA de confirmar. Arranca con el valor del entrenador.
- Rango 0 a 10:00, de a 15″. En 0 el ejercicio queda sin timer.
- Si el valor elegido difiere del plan, la fila lo dice: "Descanso 2:00 · plan 1:30".
- Cambiarlo guarda `restOverrideSeconds` en Room y vale para las próximas series de ese ejercicio. El descanso que ya está corriendo no cambia (para eso están los ±15″ del timer).
- `WorkoutExercise.restTotal` pasa a usar `restOverrideSeconds ?: restSeconds`.

### 4.3 Registro del descanso real

Cuando el descanso deja de correr, el repositorio le escribe a la serie que lo disparó (la última serie confirmada, `lastDoneSet()`) los segundos redondeados desde su `executedAt`:

| Cómo termina | Fin que se usa |
|---|---|
| Llega a 0 (pantalla o service) | `endsAt`, no el momento en que se detectó (la app pudo estar cerrada) |
| "Saltar", o −15″ hasta 0 | ahora |
| Terminar la sesión con el descanso corriendo | ahora |

- Va en la misma escritura de Room que cierra el descanso (dentro del Mutex del repositorio).
- La serie todavía no subió: la sincronización solo sube sesiones terminadas. No hace falta volver a marcarla `PENDING`.
- Corregir una serie no toca su descanso.
- Confirmar una serie nueva con un descanso todavía corriendo (el alumno cambió de ejercicio desde la lista) cierra ese descanso en ese momento.
- Descartar la sesión borra todo, como hoy.

### 4.4 Sincronización

`SessionSetDto` suma `rest_seconds`. Nada más cambia en la tarjeta 11.

### 4.5 Historial

- Cada serie muestra su descanso: "S2 · 20 kg × 10 · desc. 2:00".
- Si difiere del plan, se marca (color de acento) y suma el plan: "desc. 2:00 (plan 1:30)". Difiere = los segundos redondeados no son iguales.
- Sin descanso registrado no se muestra nada.
- El plan sale del `planned.rest_seconds` del servidor, o de la copia del plan en Room para las sesiones locales.

## 5. Pruebas

- **Backend (Jest):** validación (`rest_seconds` válido, nulo, ausente, negativo, > 3600, decimal), repositorio (la columna entra en el insert y en el select del historial), modelo del historial (serie y `planned` con `rest_seconds`).
- **Mobile (unit):** reglas puras del descanso real (llega a 0 con la app cerrada, saltar, pausa, ±15″, terminar con el descanso corriendo, última serie de la sesión nula); `restTotal` con override; mapper del DTO; texto del historial (igual al plan, distinto, nulo); migración 8 → 9.
- **Manual (emulador):** el criterio de aceptación de punta a punta, contra el backend local.

## 6. Fuera de alcance

- La vista web (tarea de Pablo).
- Guardar el plan vigente al momento de la sesión (ver §3.3).
- Medir cuánto tarda el alumno entre que termina el timer y confirma la serie.
