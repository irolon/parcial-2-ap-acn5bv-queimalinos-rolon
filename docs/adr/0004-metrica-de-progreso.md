---
title: ADR 0004 — Métrica de progreso
aliases: [ADR 0004 — Métrica de progreso, Métrica de progreso]
creado: 2026-10-29
tags: [arquitectura, adr]
---

# ADR 0004 — La curva de progreso usa el 1RM estimado (Epley)

- **Estado:** aceptado
- **Fecha:** 2026-10-29

## Contexto

`GET /progress/exercise/:exerciseId` (tarjeta 32) tiene que devolver, por cada
día entrenado, un número que diga si el alumno progresa en un ejercicio. Una
sesión tiene varias series con pesos y repeticiones distintos, y esas series
pueden ser de 3 o de 15 repeticiones: hay que decidir qué métrica resume el día
y cuál se grafica por defecto.

## Decisión

1. **El punto del día trae las tres métricas**: `max_kg` (mayor peso),
   `volume_kg` (Σ repeticiones × kg) y `e1rm_kg` (1RM estimado). La respuesta
   incluye `default_metric` y los clientes eligen cuál graficar. Se elige en
   escalones: `e1rm_kg` si algún punto lo tiene mayor a 0; si no, `max_kg` si algún
   punto tiene kg mayor a 0; si no, `reps`. Sin puntos, `e1rm_kg`.
2. **La métrica por defecto es el 1RM estimado con Epley**, calculado por serie
   y tomando el máximo del día: `reps = 1 → kg`; `reps > 1 → kg × (1 + reps / 30)`.
   **Solo cuentan las series de hasta 12 repeticiones**: las de más aportan
   `null` al 1RM estimado (y por lo tanto al `pr.e1rm_kg`), pero siguen
   sumando en `max_kg`, `volume_kg`, `sets` y `reps`.
3. **Solo cuentan las series completadas con repeticiones** (`completed` y
   `actual_reps > 0`). Una serie sin peso (`actual_kg` nulo o 0, como manda el
   celular en peso corporal) suma al volumen como 0 y no aporta 1RM: su
   `e1rm_kg` es `null`, no 0, así el `pr.e1rm_kg` tampoco queda en 0.
4. **Día calendario argentino**: el punto se agrupa por la fecha de
   `sessions.started_at` en `America/Argentina/Buenos_Aires`.
5. **El volumen semanal** (`GET /progress/overview`, tarjeta 34) suma
   `volume_kg` con la misma regla de series que cuentan y agrupa por semana que
   empieza el lunes, en hora argentina (`date_trunc('week', …)` sobre la fecha
   local). Las semanas sin series vienen en 0 (se generan con `generate_series`)
   para que el gráfico no tenga huecos; `sessions` cuenta sesiones distintas con
   al menos una serie que cuenta.
6. **La agregación vive en Postgres** (función `exercise_progress`, llamada con
   `supabase.rpc`) y el redondeo a 1 decimal, en el modelo.

## Alternativas

- **Peso máximo como métrica única:** es simple, pero ruidoso: un día con una
  serie pesada de 1 repetición parece un retroceso frente a otro con 8
  repeticiones más livianas aunque el trabajo sea mayor, y no refleja ganar
  repeticiones con el mismo peso.
- **Volumen (Σ reps × kg):** refleja el trabajo total, pero es difícil de leer
  para el alumno (un número grande que depende de cuántas series hizo ese día)
  y sube con solo agregar series.
- **Brzycki** (`kg × 36 / (37 − reps)`): da valores parecidos a Epley con pocas
  repeticiones, pero diverge con muchas y se indefine cerca de las 37.
  Epley crece de forma lineal y siempre está definida.

## Consecuencias

- Epley **sobreestima con más de 12 repeticiones**, por eso esas series no
  entran al 1RM estimado. Sin el tope, un día liviano de 70 kg × 22 daría 121,3
  y superaría a otro de 100 kg × 5 (116,7): la curva mostraría una suba y el
  `pr` marcaría un récord que no existe. Un día con solo series de más de 12
  repeticiones trae `e1rm_kg` en `null`. La curva sirve para ver la tendencia
  de un alumno, no como valor absoluto de su máximo.
- Los ejercicios de **peso corporal no tienen 1RM**: su punto trae `e1rm_kg` en
  `null`, `max_kg` en `null` (sin `actual_kg`) o en 0 (el celular siempre manda
  un número y usa 0 como piso), y solo `sets`, `reps` y `volume_kg` (0). Como el
  gráfico por defecto saldría vacío o plano, para esos ejercicios
  `default_metric` es `reps`: se mira `max_kg > 0`, no `max_kg` distinto de `null`.
- Un ejercicio **con peso pero siempre de más de 12 repeticiones** (abdominales
  con 5 kg × 20) tiene `max_kg` pero `e1rm_kg` en `null` en todos los puntos: su
  `default_metric` es `max_kg`, para que el gráfico por defecto no quede vacío.
- Las tres métricas conviven en cada punto, así que cambiar la métrica por
  defecto es un cambio de `default_metric`, sin tocar la base.
- La sustitución de ejercicios se resuelve por lo realmente hecho: la curva de X
  usa `exercise_id = X`, así que la serie sustituida no ensucia al original.
- La consulta de la curva usa `idx_session_sets_exercise_session (exercise_id, session_id)`;
  el índice viejo `(exercise_id)` se borró por redundante.
- `last_session_kg` de `GET /routines/today` usa la misma regla de "series que
  cuentan" y se resuelve con la función `last_session_kg`, en una sola consulta
  por rutina.
- Las funciones son `security invoker` con `search_path` fijo y ejecutables
  solo por `service_role` (ADR 0001).
