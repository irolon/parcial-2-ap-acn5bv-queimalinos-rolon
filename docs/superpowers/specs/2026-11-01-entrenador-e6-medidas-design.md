---
tags: [spec]
tarjeta: E6
---
# Spec — E6 · Medidas corporales del alumno (mobile)

- **Tarjeta:** [E6 del tablero del entrenador](https://trello.com/c/ZQHfuZlN).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-medidas`, apilada sobre `feature/android-entrenador-progreso` (E5).
- **Contrato:** `GET /students/:id/metrics`, `POST /students/:id/metrics` y `DELETE /students/:id/metrics/:metricId`. El backend no se toca.

> **Cómo quedó (01/11):**
> - El refresco del gráfico corporal (E5) no aplica todavía: los gráficos pasaron a **E5b**.
> - La ficha se refresca desde el ViewModel después de guardar o borrar (`detailRepository.refresh`), no desde el repositorio con un scope de aplicación: develop no tiene uno.
> - El `id` del POST se genera al abrir la hoja: un doble toque o un reintento usan el mismo id y el backend no duplica.
> - Las tablas son `trainer_student_metrics` (PK trainerId, id) y `trainer_student_metrics_sync` (PK trainerId, studentId).
> - Un 403 (alumno ajeno) es `DataError.NotFound`.

## 1. Objetivo

El entrenador mide al alumno en el gimnasio y lo carga ahí mismo desde el celular. También ve el historial de medidas y borra una medida mal cargada.

**Criterio de aceptación:** el entrenador carga una medida nueva desde el celular y aparece en el historial, en la "Última medición" de la ficha y en el gráfico de peso de E5.

## 2. Decisiones (debate del 01/11)

- **El IMC no se calcula en el celular:** se usa el `bmi` que devuelve el backend.
- **Offline:** el historial se cachea y se ve en modo avión. Cargar y borrar piden red: sin conexión, el botón "Nueva medida" se deshabilita con "Necesitás conexión".
- **Borrar** pide confirmación ("¿Borrar la medida del 20/10?").

## 3. Pantallas

### 3.1 En la ficha (E3)

La tarjeta "Última medición" suma "Ver historial" y "+ Nueva medida".

### 3.2 Historial (`trainer/students/{id}/metrics`)

- Lista de la más reciente a la más vieja.
- Cada ítem muestra la fecha, peso, IMC y grasa, y en una segunda línea las circunferencias (cintura, cadera, pecho) que tenga.
- Marca "por el alumno" o "por vos" según `recorded_by`.
- Borrar con un toque largo o con un ícono de papelera (toque de 44 dp).
- Botón "+ Nueva medida".

### 3.3 Nueva medida (hoja inferior)

- **Campos numéricos opcionales:** peso (kg), altura (cm), grasa (%), cintura, cadera y pecho (cm). Hace falta al menos uno.
- **Fecha:** hoy por defecto, editable y nunca futura.
- **Validación:** los rangos del contrato.
- "Guardar": con un 201, cierra la hoja y la medida aparece arriba.
- Después de guardar o borrar se refrescan la ficha (E3, última medición) y el gráfico corporal (E5) en segundo plano.

## 4. Datos

- **Room:**
  - tabla `trainer_student_metrics` (`trainerId, studentId, id, recordedAt`, las medidas, `bmi`, `recordedBy`) más su marca de sincronización;
  - migración a la versión siguiente.
- **`StudentMetricsRepository`** en `data/students/metrics/`:
  - `observe(trainerId, studentId)`;
  - `refresh(...)`;
  - `add(...)`: inserta la respuesta en el caché;
  - `delete(...)`: la saca del caché solo si el servidor respondió 204 o 404;
  - es parte del `UserDataCleaner`.
- **`StudentsApi`** suma `metrics`, `addMetric` y `deleteMetric`.

## 5. Pruebas

- **Unit:**
  - validación: ninguno cargado, fuera de rango, fecha futura;
  - armado del request: números con coma, opcionales en `null`, fecha con zona;
  - repositorio: refresh, add, delete con 404 que igual la saca, error de red que no toca el caché;
  - ViewModel: sin conexión y confirmación de borrado.
- **Migración (androidTest).**
- **E2E:** cargar peso 80,5 y cintura 82 para el alumno al día, ver la medida en el historial, en la ficha y en el gráfico de peso; borrarla.

## 6. Fuera de alcance

Editar una medida (el backend no tiene PUT/PATCH: se borra y se vuelve a cargar). Fotos de progreso.
