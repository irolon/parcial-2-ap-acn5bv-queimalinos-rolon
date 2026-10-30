---
title: ADR 0005 — La racha se mide contra los días asignados
aliases: [ADR 0005 — La racha se mide contra los días asignados, Racha contra días asignados]
creado: 2026-10-30
tags: [arquitectura, adr]
---

# ADR 0005 — La racha se mide contra los días asignados

- **Estado:** aceptado
- **Fecha:** 2026-10-30

## Contexto

El [[arquitectura/adrs|ADR-007]] define
la racha como "días/semanas consecutivas de entrenamiento". Con esa regla, un
alumno con una rutina de lunes, miércoles y viernes nunca pasaría de 1 día de
racha: los martes y jueves "corta" aunque haya cumplido todo su plan. La racha
tiene que premiar la constancia con el plan que le armó el entrenador, no
entrenar todos los días (tarjeta 41, gamificación backend).

Además hay que decidir dónde se guarda la racha y cuándo se calcula, porque
los logros `STREAK_7_DAYS` / `STREAK_30_DAYS` y los desafíos de tipo `streak`
dependen de ella.

## Decisión

1. **La racha cuenta días asignados seguidos entrenados.** Se trabaja con el
   día calendario de Argentina (`America/Argentina/Buenos_Aires`, formato
   `YYYY-MM-DD`). Los días asignados son la **unión** de los `days` de las
   rutinas activas actuales del alumno.
2. **Reglas del recorrido** (de hoy hacia atrás):
   - un día asignado con al menos una sesión cerrada (`finished_at` no nulo) suma 1;
   - un día asignado sin sesión cierra la racha;
   - un día **no asignado** no corta: si se entrenó suma 1 (bonus), si no se saltea;
   - **hoy nunca corta**: si todavía no se entrenó, la racha sigue viva hasta que termine el día.
3. **Sin rutina activa, todos los días son asignados** (la racha vuelve a ser
   de días corridos). Por la misma razón, el logro de semana completa
   (`full_week`) no se gana sin rutina activa.
4. **Se guarda en `student_streaks`** (`student_id` PK, `current_days`,
   `longest_days`, `last_trained_date`, `updated_at`) y se **recalcula desde el
   historial** de sesiones cerradas, no de forma incremental: al cerrar una
   sesión y en el job diario de las 03:00 ART. `longest_days` es la mayor
   racha del historial con la misma regla. El cálculo es una función pura
   (`computeStreak`) en `models/gamification/streak.js`.
5. **Este ADR reemplaza el "días consecutivos"** del ADR-007 (y de los docs
   que lo repetían). El resto del ADR-007 sigue vigente.

## Alternativas

- **Días corridos (consecutivos):** simple, pero castiga a quien cumple una
  rutina de 3 o 4 días por semana. Descartada por injusta con el plan real.
- **Semanas consecutivas con el plan completo:** premia el plan, pero tiene
  granularidad semanal y un solo desliz borra la semana; no sirve para un
  desafío "racha de 14 días". Se usa como logro aparte (`full_week`), no como racha.
- **Contador incremental** (sumar 1 por sesión y resetear a 0 si falta un día):
  barato, pero se desfasa si se edita una sesión, se cambia la rutina o falla
  un cierre, y no se puede corregir sin reprocesar. Descartada a favor de
  recalcular desde el historial.
- **Calcular al leer, sin tabla:** siempre correcto, pero recorre todo el
  historial en cada `GET /students/:id/streak` y los desafíos y logros
  necesitan el valor guardado. Se guarda como caché derivada.

## Consecuencias

- Cambiar la rutina activa (por ejemplo, de 3 a 5 días) cambia los días
  asignados "hacia atrás": la racha se recalcula con los días de hoy, no con
  los que había asignados en el pasado. Es una simplificación aceptada: no
  hay historial de rutinas por fecha.
- `student_streaks` es una tabla derivada: se puede borrar y se reconstruye
  sola (el `GET` la calcula si falta la fila). Corre con RLS activado y sin
  políticas, como el resto (ADR 0001).
- Una racha rota se refleja después de la próxima evaluación (post-sesión o
  job diario), no en el instante en que pasa el día.
- El día se interpreta en hora de Buenos Aires: una sesión cerrada a las 23:30
  ART cuenta para ese día aunque en UTC ya sea el siguiente.
