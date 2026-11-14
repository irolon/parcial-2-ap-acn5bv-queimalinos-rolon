# Editar rutinas ya asignadas (deseable) — diseño

Fecha: 14/11/2026 · Tarjeta: "Editar rutinas ya asignadas (reordenar y reemplazar ejercicios)" (surge de la 9).

## Objetivo

El PT abre una rutina ya asignada en el mismo editor de la web, en **modo edición**, desde el listado de rutinas
(`/pt/rutinas`) y desde la ficha del alumno (tarjeta "Rutina activa"). Puede cambiar nombre, objetivo, nivel y días;
series, reps, descanso, kg, tempo y nota de cada ejercicio; reordenar, agregar, quitar y **reemplazar** ejercicios; y
guardar. El alumno ve la rutina actualizada (Hoy, Mis rutinas) y el historial de sesiones pasadas queda intacto.

## Decisiones

1. **Sin endpoint nuevo ni migración: la web usa los endpoints granulares que ya existen** (`PATCH /routines/:id`,
   `POST /routines/:id/exercises`, `PATCH|DELETE /routines/:id/exercises/:reId`, `PUT /routines/:id/exercises/order`).
   El editor calcula la diferencia entre la rutina cargada y lo que hay en pantalla y manda solo lo que cambió, en este
   orden: cabecera → altas → cambios → bajas → orden final.
   - Las altas van antes que las bajas: así reemplazar el único ejercicio no choca con el 409 `ROUTINE_NEEDS_EXERCISE`.
   - El orden final va con el `PUT .../order`, que es atómico (función SQL con la rutina bloqueada).
   - Un `PUT /routines/:id` que reemplace todo daría atomicidad, pero sin transacciones entre tablas desde el backend
     (Supabase JS) tendría que borrar e insertar todas las filas: cambiaría los `routine_exercises.id` de **todos** los
     ejercicios en cada guardado, y `session_sets.routine_exercise_id` (el enlace al plan del historial) quedaría en
     null para toda la rutina. El diff solo toca las filas que cambian. No encontramos un problema de consistencia que
     lo justifique: cada paso deja una rutina válida.
   - **Si un paso falla a mitad de camino**, lo ya guardado queda guardado: el editor anota los ids nuevos que devolvió
     el alta en las filas de la pantalla, recarga la rutina del servidor como nueva base y muestra el error. Lo que el
     PT escribió no se pierde; "Guardar cambios" de nuevo manda solo lo que falta.
2. **Reemplazar = quitar la fila vieja y agregar la nueva en la misma posición, con los mismos valores del plan**
   (series, reps, descanso, kg, tempo, nota). En la pantalla es una acción del menú ⋯ de la fila ("Reemplazar"):
   se elige el ejercicio nuevo en la biblioteca. No se cambia el `exercise_id` de la fila en el lugar porque las series
   pasadas que apuntan a esa fila (`session_sets.routine_exercise_id`) mostrarían en el historial el plan de un
   ejercicio que no es el que hicieron. Al borrar la fila el enlace pasa a null (`on delete set null`) y el historial y
   el progreso siguen intactos: se basan en `session_sets.exercise_id`, el ejercicio realmente hecho.
3. **Sin borrador en modo edición.** El borrador de `localStorage` (`fittrainer.routine-draft.<trainerId>`) es solo del
   alta; el modo edición no lo lee ni lo escribe, así no se mezclan. Hay un botón "Descartar cambios" que vuelve a la
   rutina guardada.
4. **Concurrencia:** antes de guardar se vuelve a pedir `GET /routines/:id` y se compara con lo que se cargó al abrir.
   Si cambió (por ejemplo, el PT la editó desde el celular o desde otra pestaña), se avisa: "Recargar" (descarta lo de la
   pantalla y trae la versión nueva) o "Guardar igual" (lo de la pantalla gana; el diff se calcula contra la versión
   nueva). Después de guardar siempre se recarga la rutina del servidor.
5. **Rutina inactiva / alumno dado de baja:** se pueden editar (el backend lo permite y no hay riesgo). Si la rutina
   está inactiva el editor lo avisa ("el alumno no la ve"). El modo edición no cambia `active`.
6. **Plantillas en modo edición:** no se ofrecen "Usar plantilla" ni "Guardar como plantilla" (el modo edición es para
   ajustar una rutina asignada; las plantillas siguen en el alta). "Reemplazar" solo aparece en modo edición.
7. **Celular (Igna):** no es parte de esta PR. No necesita cambios: `GET /routines/mine` y `/today` devuelven la rutina
   editada; una serie offline con un `routine_exercise_id` que ya no existe se guarda con el enlace en null (ya lo hace
   `session-sets.service`).

## Contrato

Sin cambios en la API. Se documenta en `contratos-api.md` cómo la usa el editor web (orden de las llamadas y
reemplazo).

## Cambios de datos

Ninguno (sin migración).

## Pantallas

- `/pt/rutinas/:id/editar` (nueva): el editor con la rutina cargada. Topbar "Editar rutina — <nombre>" ·
  "RUTINAS › EDITAR". Botones: "Descartar cambios" y "Guardar cambios".
- `/pt/rutinas`: cada fila suma un link "Editar".
- Ficha del alumno: la tarjeta "Rutina activa" suma un link "Editar".

## Criterio de aceptación

- Desde el listado y desde la ficha se abre la rutina en el editor con cabecera y ejercicios en orden.
- Cambiar cabecera, valores, orden, agregar, quitar y reemplazar, y guardar, deja la rutina así en el servidor; el
  alumno la ve así en Hoy y Mis rutinas.
- Con la rutina sin cambios, "Guardar cambios" no manda nada.
- Si la rutina cambió desde que se abrió, se avisa antes de pisarla.
- Si un paso falla, se muestra el error, no se pierde lo escrito y reintentar completa lo que faltaba.
- El borrador del alta no se toca.
