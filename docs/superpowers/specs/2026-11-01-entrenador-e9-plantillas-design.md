---
tags: [spec]
tarjeta: E9
---
# Spec — E9 · Plantillas de rutina: listar y asignar

- **Tarjeta:** [E9 del tablero del entrenador](https://trello.com/c/RgvL6wzX).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-plantillas`, apilada sobre `feature/android-entrenador-rutinas` (E8, PR #60).
- **Diseño:** el prototipo no tiene pantallas de plantillas. Siguen el estilo de E8: tema oscuro, `SectionCard`, toque mínimo de 44 dp.

> **Cómo quedó (01/11):**
> - **Asignar** vive en un `AssignTemplateController` (`ui/templates/trainer/assign/`), aparte del ViewModel del detalle. Lo mismo para "Guardar como plantilla": `SaveAsTemplateController` en el editor de E8, porque el ViewModel del editor estaba en el límite de 200 líneas. Para hacer lugar, el editor expone `picker` directo y el cálculo de ↑/↓ pasó a `List<String>.moved()`.
> - **`instantiate`** guarda la rutina nueva en el caché de E8 con `TrainerRoutinesRepository.store`, así el editor la abre sin esperar.
> - **"Desactivar la rutina actual"** se extrajo a `deactivateOthers` (`data/routines/trainer/DeactivateOthers.kt`). La usan el asistente de E8 y la asignación.
> - **`CheckRow`:** en el E2E apareció que el texto de la casilla no la marcaba, ni en E8 ni acá. Ahora toda la fila responde al toque y se usa en los dos lugares.
> - **Más:** `AccountMenuScreen` recibe `MenuLink`s y los del entrenador salen de `navigation/TrainerMenuLinks.kt`. `TRAINER_MORE_ROUTE` es una constante, y las rutas de plantillas desde Más dejan marcada esa pestaña.
> - **Desde Más,** después de asignar el editor queda arriba del detalle de la plantilla. Desde la ficha, las pantallas de plantillas salen del back stack y "atrás" vuelve a la ficha.

## 1. Objetivo

El entrenador ve sus plantillas con su detalle y le asigna una a un alumno eligiendo los días. Se copia, según el ADR 0003: editar la plantilla después no toca la rutina asignada.

**Criterio de aceptación:** el entrenador asigna una plantilla a un alumno desde el celular y el alumno la ve en Mis rutinas.

## 2. Decisiones (debate del 01/11)

1. **Dónde vive:** la entrada **"Plantillas"** va en la pestaña **Más**. Más adelante E10 suma "Biblioteca" y E14 "Desafíos".
2. **Dos caminos a la misma asignación:**
   - **Desde Más:** Plantillas → detalle → "Asignar a un alumno" → elegir el alumno entre los activos (los cacheados de E1).
   - **Desde la ficha:** "Asignar rutina" abre una hoja con **"Rutina nueva"** (el asistente de E8) y **"Desde plantilla"**. La segunda abre la lista de plantillas con el alumno ya elegido.
3. **Hoja "Asignar":**
   - Campos: alumno (fijo o elegido), nombre (prellenado con el de la plantilla) y días (prellenados con los de la plantilla).
   - **"Desactivar la rutina actual"**, marcado por defecto, con la misma regla que E8: solo aparece si el alumno tiene alguna activa, y si falla al desactivar, la rutina se asigna igual y se avisa.
   - El objetivo es el de la plantilla (el backend no lo deja cambiar al instanciar).
4. **Después de asignar** se abre el editor de E8 con la rutina nueva. Desde la ficha, "atrás" vuelve a la ficha.
5. **Extra aprobado: "Guardar como plantilla"** en el editor de E8. Es una hoja con nombre (prellenado) y nivel opcional, que llama a `POST /routine-templates/from-routine`.
6. **Offline:** la lista y el detalle quedan cacheados en Room. Asignar y guardar como plantilla son solo con red, con aviso.
7. **No se crean, editan ni borran plantillas desde el celular.** No está en la tarjeta (YAGNI); eso queda en la web.

## 3. Backend

No cambia. Usa lo que ya existe en `/routine-templates`:
- `GET /`: resumen con `days` y `exercise_count`.
- `GET /:id`: `structure` con cada ejercicio y sus datos.
- `POST /:id/instantiate` con `{ student_id, name?, days? }`: devuelve la rutina como `GET /routines/:id`.
- `POST /from-routine` con `{ routine_id, name?, level? }`.

Errores que la app tiene que mostrar bien:
- 404 `TEMPLATE_NOT_FOUND`;
- 409 `TEMPLATE_STRUCTURE_INVALID` ("La plantilla está incompleta…");
- 409 `TEMPLATE_EXERCISES_UNAVAILABLE`;
- 403 si el alumno no es del entrenador.

Ante un 409 se muestra el `message` del backend.

## 4. Mobile

### 4.1 Datos (Room v19, `AutoMigration(18, 19)`)

- **`trainer_templates`**, con PK `(trainerId, id)`. Campos: `name`, `goal`, `level`, `days` (CSV), `exerciseCount`, `createdAt` y `structureJson`. Este último guarda el detalle (los ejercicios con su nombre y grupo) como JSON y es `null` si nunca se abrió con red, como `exercisesJson` en E4.
- Más **`trainer_templates_sync(trainerId, fetchedAt)`** para distinguir "Sin plantillas" de "no se bajó".
- El refresh de la lista reemplaza todo y conserva el `structureJson` de las que siguen.

### 4.2 Red y repositorio

- **`TrainerTemplatesApi`:** `list()`, `get(id)`, `instantiate(id, body)` y `fromRoutine(body)`.
- **`TrainerTemplatesRepository`** (`data/templates/trainer/`):
  - `observeList`, `observeTemplate`, `refreshList`, `refreshTemplate`;
  - `instantiate(...)`: devuelve el id de la rutina nueva y la guarda en el caché de rutinas de E8 (`TrainerRoutinesRepository`);
  - `saveFromRoutine`;
  - 404 → la borra del caché y devuelve `NotFound`; 409 → error con el mensaje del backend;
  - es `UserDataCleaner`.
- **"Desactivar las anteriores":** se extrae de `NewRoutineViewModel` a `data/routines/trainer/DeactivateOthers.kt` (`deactivateOthers(trainerId, previous, keepId): List<String>`, que devuelve los nombres que fallaron). Lo usan el asistente y la asignación.

### 4.3 UI

- **`ui/templates/trainer/list/`:**
  - lista con nombre, "Hipertrofia · Intermedio" y "LUN · MIÉ · VIE · 6 ejercicios";
  - estados vacío ("Todavía no tenés plantillas. Creálas en la web o guardá una rutina como plantilla."), sin conexión y error con reintento;
  - en modo "para un alumno", el título dice "Plantillas · para <nombre>".
- **`ui/templates/trainer/detail/`:** cabecera (objetivo, nivel, días) y la lista de ejercicios con la prescripción, más el botón "Asignar a un alumno" (o "Asignar a <nombre>").
- **`ui/templates/trainer/assign/`:** la hoja "Asignar":
  - selector de alumno (solo los activos; con búsqueda si hay más de 8);
  - nombre, días (`RoutineHeaderFields` sin objetivo) y la casilla;
  - "Asignar" se deshabilita sin red y durante el envío.
- **Ficha:** "Asignar rutina" abre `AssignChoiceSheet` (Rutina nueva / Desde plantilla).
- **Editor de E8:** botón "Guardar como plantilla" al pie, con su hoja (nombre y nivel).
- **Más:** `AccountMenuScreen` recibe una lista de accesos (`MenuLink`). El entrenador suma "Plantillas"; el alumno no cambia.
- **Rutas** (`navigation/TrainerTemplateRoutes.kt`):
  - `trainer/templates` y `trainer/templates/{templateId}`;
  - `trainer/students/{studentId}/templates` y `trainer/students/{studentId}/templates/{templateId}`, que heredan la pestaña Alumnos.
  - Las de Más heredan la pestaña Más: se suma `trainer/templates` a `parentTab`.

## 5. Bordes

- **Plantilla con ejercicios borrados o incompleta:** 409, y la hoja muestra el mensaje del backend.
- **Alumno dado de baja:** no aparece en el selector. Desde la ficha no se llega, porque el botón no se muestra.
- **La plantilla se borró en la web mientras estaba abierta:** 404 → toast "La plantilla ya no existe" y vuelve a la lista.
- **Doble toque en "Asignar":** se hace un solo POST, también después de asignada (igual que el asistente de E8).

## 6. Pruebas

- **Unitarias:**
  - repositorio: reemplazo de la lista conservando el detalle, 404 → sale del caché, 409 con mensaje, el instantiate guarda la rutina en el caché de E8;
  - `deactivateOthers`;
  - ViewModels: lista, detalle, hoja de asignar (días prellenados y en orden, casilla, falla al desactivar, doble toque, sin red, 409) y guardar como plantilla.
- **Migración:** `MigrationV19Test` en el emulador.
- **E2E en el emulador:**
  1. Como profe.card8, guardar una rutina como plantilla.
  2. Desde Más → Plantillas, asignarla a un alumno con otros días.
  3. Entrar como el alumno y verla en **Mis rutinas** (criterio de aceptación).
  4. También el camino desde la ficha → "Desde plantilla".
  5. Restaurar los datos de prueba al final.
