---
title: ADR 0003 — Las plantillas de rutina se copian
aliases: [ADR 0003 — Las plantillas de rutina se copian, Plantillas se copian]
creado: 2026-10-24
tags: [arquitectura, adr]
---

# ADR 0003 — Las plantillas de rutina se copian al asignarlas

- **Estado:** aceptado
- **Fecha:** 2026-10-24

## Contexto

El entrenador guarda una rutina como plantilla y la asigna a varios alumnos
(HU-07, CU-04 2a). Después puede querer ajustar los pesos de un alumno, o
editar o borrar la plantilla. Hay que decidir qué relación queda entre la
plantilla y las rutinas que salieron de ella.

El schema ya tiene `routines.template_id` con `on delete set null`
(`backend/src/database/schema/03-routines.sql`), y la plantilla guarda su
contenido en un `structure` jsonb versionado (`version: 1`).

## Decisión

1. **Instanciar copia.** `POST /routine-templates/:id/instantiate` crea una
   `routine` y una fila de `routine_exercises` por cada ejercicio de la
   `structure`. La rutina es independiente de la plantilla.
2. **`template_id` es solo el origen** (trazabilidad). No se usa para leer
   contenido: nada del comportamiento de una rutina depende de la plantilla.
3. **Editar o borrar la plantilla no toca las rutinas ya asignadas.** Al
   borrarla, sus rutinas quedan con `template_id = null` (FK existente).
4. **Personalizar es editar la rutina**, no la plantilla:
   `PATCH` y `DELETE /routines/:id/exercises/:routineExerciseId`. No hay
   `customizations` dentro de `instantiate`: se instancia y después se edita.
5. **Se revalida al copiar.** Los ejercicios de la plantilla pudieron borrarse
   desde que se guardó; si alguno ya no es accesible, se responde 409
   `TEMPLATE_EXERCISES_UNAVAILABLE` con los ids en `details`.
6. **Atomicidad por compensación** (sin transacción entre tablas): se inserta
   la rutina y después los ejercicios; si falla el segundo paso se borra la
   rutina y se propaga el error. `POST /routines` usa el mismo helper
   (`createWithExercises`).

## Alternativas

- **Referencia viva** (la rutina lee sus ejercicios de la plantilla): cualquier
  edición o borrado de la plantilla cambiaría rutinas que los alumnos ya están
  haciendo, y personalizar los pesos de un alumno sin tocar a los demás
  exigiría un sistema de excepciones por encima. Descartada: contradice el
  criterio de aceptación de la tarjeta.
- **Versionado de plantillas** (cada edición crea una versión y la rutina fija
  la suya): resuelve el cambio silencioso, pero suma tablas, migraciones y UI
  de versiones que el MVP no necesita. Se puede retomar si aparece la
  necesidad de "actualizar a la última versión".

## Consecuencias

- Los datos de ejercicios se duplican por rutina; es poco volumen y simplifica
  las consultas de `/today` y `/mine`, que no cambian.
- Una mejora hecha a una plantilla no llega sola a los alumnos: hay que volver
  a instanciarla (la rutina nueva convive con las anteriores del alumno).
- `structure.version` permite evolucionar el documento sin migrar datos; el
  proceso de copia es el único lugar que lo interpreta hacia `routine_exercises`.
- La plantilla inicial al invitar un alumno (necesita `invitations.template_id`)
  queda fuera de esta decisión y reutilizará la misma copia.
