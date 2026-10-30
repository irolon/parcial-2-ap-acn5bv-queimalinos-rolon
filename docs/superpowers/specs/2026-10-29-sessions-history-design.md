# Historial de sesiones y comentarios del entrenador

- **Tarjeta de equipo:** [S3] Historial de sesiones y comentarios del PT en la web (https://trello.com/c/6NlX3ee6), fuente de verdad.
- **Tablero personal:** "12 · Historial de sesiones y comentarios del PT en la web".
- **Fecha:** 2026-10-29 · **Rama:** `feature/sessions-history` (desde `develop`; no depende de la PR #31 de Progress).

## 1. Criterio de aceptación (tarjeta de equipo)

El PT abre un alumno, ve sus últimas 20 sesiones paginadas, expande una y ve todas las series con real contra planificado. Deja un comentario y el alumno lo ve en su historial. Una sesión con sustituciones aparece marcada.

## 2. Backend

### 2.1 `GET /api/students/:id/sessions?page=&limit=`

Roles `trainer` (sus alumnos) y `student` (él mismo) con `assertCanAccessStudent` (403 si no). Paginación de la convención del repo: `page` desde 1 (default 1), `limit` default 20, máximo 100; valores inválidos caen al default. Orden `started_at` descendente.

```json
{ "data": [{
    "id": "uuid", "started_at": "ISO", "finished_at": "ISO|null", "duration_min": 54,
    "routine": { "id": "uuid", "name": "Push · día 3" },
    "rpe": 8, "notes": "…", "trainer_comment": "…|null", "has_modifications": false,
    "sets": 18, "volume_kg": 4210.5, "has_pr": true
  }],
  "meta": { "total": 57, "page": 1, "limit": 20, "total_pages": 3 } }
```

- `duration_min` = minutos enteros de `finished_at − started_at` (redondeo); `null` si no se cerró.
- `routine` `null` si la sesión no tiene rutina (o se borró).
- `sets` = series completadas con `actual_reps > 0`; `volume_kg` = Σ `actual_reps × coalesce(actual_kg, 0)` de esas series (1 decimal) — misma regla que Progress.
- `has_pr` = la sesión tiene al menos un récord (§2.4).

### 2.2 `GET /api/students/:id/sessions/:sessionId`

Mismos permisos; la sesión tiene que ser de ese alumno (si no → 404 `SESSION_NOT_FOUND`). Devuelve el resumen de §2.1 más:

```json
"exercises": [{
  "exercise": { "id": "uuid", "name": "Press de banca" },
  "original_exercise": { "id": "uuid", "name": "Press con mancuernas" } ,
  "planned": { "sets": 4, "reps": 10, "suggested_kg": 60 },
  "is_pr": true,
  "sets": [{ "id": "uuid", "set_number": 1, "actual_reps": 10, "actual_kg": 62.5, "completed": true, "executed_at": "ISO" }]
}]
```

- Agrupado por ejercicio realmente hecho (y por `original_exercise_id` si fue sustitución), en el orden en que se hicieron (primer `executed_at`).
- `original_exercise` `null` si no hubo sustitución.
- `planned` sale del plan **actual** de la rutina vía `routine_exercise_id` (`routine_exercises.sets`, `reps`, `suggested_kg`); `null` si la serie no tiene enlace ("sin plan").
- `is_pr` según §2.4.

### 2.3 `PATCH /api/sessions/:id/comment`

Solo `trainer`. Body `{ "trainer_comment": "string ≤ 1000 | null" }`; `""` o `null` lo borran (se guarda `null`). La sesión tiene que ser de un alumno del entrenador; si no existe o es ajena → 404 `SESSION_NOT_FOUND`. Responde 200 con el resumen de §2.1 de esa sesión. El router de sesiones pasa de `requireRole('student')` global a roles por ruta (las rutas del alumno siguen igual).

### 2.4 Récords personales

Para cada ejercicio realmente hecho en una sesión: su mejor 1RM estimado (Epley, misma fórmula que el ADR 0004: `reps = 1 → kg`; `reps > 1 → kg × (1 + reps/30)`, solo series completadas con `0 < actual_reps <= 12` y `actual_kg` no nulo: Epley sobreestima por encima de 12 repeticiones y generaría récords falsos, p. ej. 70 kg × 22 = 121,3 le ganaría a 100 kg × 5 = 116,7) **supera estrictamente** al mejor de **todas las sesiones anteriores** del alumno (por `started_at`). **La primera vez que hace un ejercicio no cuenta.**

Función SQL `session_records(p_student_id uuid, p_session_ids uuid[]) returns table (session_id uuid, exercise_id uuid)` en la migración `2026-10-29-sessions-history.sql` (y en el schema), `language sql stable security invoker`, `set search_path = public`, `revoke all … from public, anon, authenticated; grant execute … to service_role`. Usa el índice `sessions (student_id, started_at desc)`.

### 2.5 Errores y docs

Errores existentes (`SESSION_NOT_FOUND`, `VALIDATION_ERROR`, `FORBIDDEN`). `trainer_comment` se agrega a las respuestas de sesiones donde corresponde (no a lo que ve el endpoint de escritura del alumno). Contrato (`contratos-api.md`), `backend/README.md`, `docs/tarjetas.md`.

## 3. Web — bloque "Últimas sesiones" en la ficha del alumno

Columna derecha de `StudentProfilePage`, debajo de la rutina activa. Componente propio con su query (módulo `sessions`; `components/shared/ui` está lleno).

- **Fila** (prototipo `docs/design/prototype-src/pt-screens.jsx` L113-143): grid `64px 1fr 80px 60px`, gap 14; col 1 fecha `22 ABR` (mono 10, ink6) y duración `54′` (mono 10, ink5); col 2 nombre de la rutina (display 13/500; "Sesión libre" si no tiene) + `Pill tone="accent" size="sm"` "PR" si `has_pr`, debajo el comentario del entrenador o, si no hay, la nota del alumno (body 11, ink6); col 3 `RPE n/10` (valor display 14/600, `hot` si ≥ 8; "—" sin RPE); col 4 botón ghost sm "Detalle" (`aria-expanded`).
- **Modificada:** `has_modifications` → `Pill tone="hot"` "Modificada" junto al nombre y borde izquierdo `hot` en la fila.
- **Detalle** (debajo de la fila, al expandir; carga `GET …/sessions/:sessionId`): por ejercicio, nombre (+ "en lugar de <original>" si fue sustitución, + "PR" si `is_pr`) y una tabla de series: `#`, reps reales vs objetivo, kg reales vs sugeridos; por encima del plan en `good`, por debajo en `hot`; "sin plan" si no hay; serie no completada → "no hecha". Debajo, la nota del alumno ("Nota del alumno", si la hay) y el comentario del entrenador, así la nota se sigue viendo cuando el entrenador ya respondió. El detalle no tiene `staleTime`: al reabrir se vuelve a pedir (las series pueden subir después desde el celular).
- **Comentario inline:** `Textarea` con el valor actual; los botones "Guardar" y "Cancelar" aparecen recién cuando cambia; Ctrl+Enter guarda; "Guardando…" mientras va; error inline si falla. Al guardar se actualiza la fila.
- **Paginación:** de a 20, botón "Cargar más" que suma la página siguiente (oculto en la última).
- **Estados:** cargando (skeleton simple), error con "Reintentar", vacío "Todavía no entrenó".
- Responsive: en < 640 px la fila pasa a dos líneas (fecha/duración arriba) sin scroll horizontal de la página; la tabla de series scrollea dentro de su caja.

## 4. Fuera de alcance

- Pantalla de historial del alumno: celular (lado de Igna) y vistas del alumno en la web (tarjeta 22).
- Notificación por el comentario o por `has_modifications` (tarjeta 20); logros por récord (tarjeta 17).
- Snapshot del plan al momento de la sesión (se compara contra el plan actual).

## 5. Verificación

- `npm run lint` y `npm test` en `backend/` y `frontend/`.
- Tests backend: paginación y `meta`; permisos (alumno propio/ajeno, entrenador propio/ajeno); resumen (duración, volumen, series, `has_pr`); detalle (agrupación, sustitución, `planned` null, `is_pr`); comentario (entrenador del alumno, ajeno → 404, vacío borra, > 1000 → 400, alumno → 403).
- Tests web: lista, PR, Modificada, expandir detalle, real vs plan, comentario (guardar, cancelar, Ctrl+Enter, error), cargar más, vacío, error.
- **Contra el backend real y Supabase dev** (migración aplicada con el script `pg`): con las 6 semanas de la alumna de prueba de la tarjeta 11, recorrer en el navegador lista, detalle, la sesión con sustitución marcada, récords, comentario y "Cargar más"; con el token de la alumna, `GET /students/<su id>/sessions` trae el comentario. Capturas a 1280 y 375 px en `docs/superpowers/specs/assets/2026-10-29-sessions-history/`.
