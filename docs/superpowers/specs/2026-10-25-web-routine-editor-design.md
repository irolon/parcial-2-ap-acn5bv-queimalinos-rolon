# Spec — Editor de rutinas en la web

- **Tarjeta (fuente de verdad):** tablero de equipo "[S2] Editor de rutinas en la web (drag & drop)" — https://trello.com/c/IfNzaaQK (tarjeta 26), con su checklist "Puntos a desarrollar".
- **Complemento:** MIS TAREAS "9 · Editor de rutinas en la web (drag & drop)" (orden, nota de diseño, énfasis en el borrador).
- **Fecha:** 2026-10-25
- **Rama:** `feature/web-routine-editor`, **apilada sobre `feature/web-students-panel` (PR #28)**: usa `listStudents`/`useStudentsQuery`, `usePageHeader`, `studentOptions`, `routineDays` y `profileHref` de esa PR. La PR apunta a esa rama y, al mergearse la #28, se le cambia el destino a `develop`.
- **Reglas:** `CONTRIBUTING.md` (200 líneas, capa → módulo → archivo, ≤ 10 archivos por carpeta, tests espejados) y los specs de la web anteriores.
- **Diseño:** prototipo E4 "Crear rutina" (`docs/design/prototype-src/pt-screens.jsx`, `PTCrearRutina`) y Guía Web p.13. `docs/diseno/mockups.md` dice "tabla editable, no drag & drop"; la tarjeta pide dnd-kit → se combinan (ver abajo).
- **Backend:** `/routines` y `/routine-templates` de `develop` (contrato en `docs/arquitectura/contratos-api.md`).

## 1. Objetivo

La pantalla estrella del entrenador: armar una rutina eligiendo ejercicios de la biblioteca, configurar cada uno, ordenarlos arrastrando (también con teclado), elegir los días y asignarla a un alumno, sin perder el trabajo si se cierra la pestaña.

**Criterio de aceptación (tarjeta de equipo):** el PT arma una rutina de 6 ejercicios, los reordena arrastrando, configura los parámetros de cada uno, elige tres días y la asigna. El alumno la ve en su app.
**Se suma (MIS TAREAS):** si se cierra la pestaña a mitad, el borrador se recupera.

## 2. Decisiones tomadas

### Pantallas
- **`/pt/rutinas`** (reemplaza el placeholder): listado simple de las rutinas del entrenador — nombre, alumno (cruzando con `listStudents`), días, activa/inactiva — más recientes primero, con botón "Nueva rutina". Solo lectura (el nombre del alumno lleva a su ficha). Vacío: "Todavía no armaste rutinas" + "Nueva rutina".
- **`/pt/rutinas/nueva`**: el editor. Topbar "Nueva rutina — <nombre>" (o "Nueva rutina") y subtítulo "RUTINAS › CREAR · AUTO-GUARDADO · HACE Ns" (con `usePageHeader`).
- La ficha del alumno (PR #28) suma el botón **"Asignar rutina"** → `/pt/rutinas/nueva?alumno=<id>` (el alumno queda preseleccionado al asignar).
- **Editar rutinas existentes queda fuera**: el backend no permite reordenar ni reemplazar los ejercicios de una rutina guardada (va a DESEABLES).

### Layout (dos paneles, checklist de equipo)
- **Biblioteca filtrable a la izquierda** (≈ 280 px) y **rutina en construcción a la derecha**. En mobile, una columna: la biblioteca se abre desde "Agregar ejercicio".
- Biblioteca compacta: buscador, chips de músculo, select de equipamiento y lista con miniatura chica, nombre, músculo y botón **"+"** (`aria-label="Agregar <nombre>"`) que agrega el ejercicio **al final**. Se puede repetir un ejercicio. Reutiliza `useExercisesQuery` y `utils/exercises` (filtrado, etiquetas, miniatura); los componentes visuales del panel son nuevos y compactos.

### Rutina en construcción: tabla editable + arrastre
- **Tabla del diseño** con una fila por ejercicio: `#`, asa de arrastre, ejercicio (miniatura chica, nombre, músculo), **Series**, **Reps**, **Descanso (s)**, **Peso (kg)**, **Tempo**, **Nota**, y menú ⋯ con "Subir", "Bajar" y "Quitar".
- **Reordenar con dnd-kit** (`@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2, versiones exactas): con mouse y **teclado** (`KeyboardSensor` + `sortableKeyboardCoordinates`: foco en el asa, Espacio para levantar, flechas, Espacio para soltar, Esc cancela) y anuncios en español para lectores de pantalla. "Subir"/"Bajar" del menú como alternativa.
- Valores por defecto al agregar: series 3, reps 10, descanso 90, resto vacío.
- Reps es un entero (el "8-10"/"AMRAP" del mockup no existe en el backend). **Fuera:** RIR/RPE (va en la nota), duración estimada y nivel de la rutina.
- Sin ejercicios: estado vacío "Agregá ejercicios desde la biblioteca".

### Cabecera
- **Nombre** (2–120), **objetivo** (select obligatorio: tonificar, bajar de peso, ganar masa muscular, ganar fuerza) y **días** (chips L M X J V S D, `role="checkbox"`).
- Muestra la plantilla de origen si la hay ("Desde: <plantilla>").

### Validación antes de enviar (checklist de equipo)
- ≥ 1 ejercicio, ≥ 1 día, series y reps enteros > 0, nombre 2–120, objetivo elegido; además descanso y peso ≥ 0, tempo ≤ 20, nota ≤ 500 (límites del backend).
- Errores en su lugar (cabecera, celda de la fila) y un resumen arriba ("Revisá 2 campos"); no se manda nada hasta que esté válido. Los `details` de un 400 (`exercises[i].campo`) se mapean a la fila.

### Asignar
- "Asignar a alumno" valida y abre un modal con el selector de **alumno activo** (preseleccionado si vino `?alumno=`). Confirmar → `POST /routines` con `student_id`, nombre, objetivo, días, ejercicios en el orden de la tabla y `template_id` si partió de una plantilla.
- Éxito: se borra el borrador y se navega a la ficha del alumno (`profileHref`), donde aparece la rutina activa. Error: mensaje en el modal (403/404/400 traducidos).
- La rutina nueva queda activa y convive con las anteriores; mobile la recibe por `/routines/mine` y respeta el orden (`order_index`).

### Plantillas
- **Partir de una plantilla:** botón "Usar plantilla" → modal con `GET /routine-templates` (nombre, objetivo, días, cantidad de ejercicios) → `GET /routine-templates/:id` precarga nombre, objetivo, días y ejercicios. Los ejercicios que ya no existen (`exercise: null`) se quitan y se avisa. Si el editor tenía contenido, se pide confirmación antes de reemplazarlo.
- **Guardar como plantilla:** botón "Guardar como plantilla" → modal con nombre (por defecto el de la rutina), objetivo y nivel (opcional) → `POST /routine-templates` con la `structure` armada en el cliente (`version: 1`, días, ejercicios ≤ 50). No hace falta asignar antes. Éxito: aviso "Plantilla guardada".

### Borrador automático (localStorage)
- Clave `fittrainer.routine-draft.<trainerId>`; se guarda ~1 s después de cada cambio (debounce): cabecera, `template_id` y por ejercicio solo `exercise_id` + parámetros (los nombres se rehidratan de la biblioteca; si un ejercicio ya no existe, se quita y se avisa).
- Al entrar con borrador: se restaura y se muestra "Recuperamos tu borrador · Descartar".
- Se borra al asignar con éxito o con "Descartar" (con confirmación). No hay botón "Guardar borrador".
- `localStorage` puede fallar (modo privado): se ignora el error y el editor sigue funcionando.

## 3. Estructura (orientativa)
- `api/routines/routines.api.js` (`listRoutines`, `createRoutine`), `api/routine-templates/routine-templates.api.js` (`listTemplates`, `getTemplate`, `createTemplate`).
- `hooks/routines/` (consultas/mutaciones, borrador), `hooks/routine-templates/`.
- `utils/routines/` (estado del editor: agregar, quitar, mover, actualizar campo; validación; armado del body de rutina y de plantilla; serialización del borrador; mapeo de errores del backend).
- `components/routines/` (cabecera, tabla, fila sortable, panel de biblioteca, modales: asignar, usar plantilla, guardar como plantilla; subcarpetas si pasa de 10).
- `pages/routines/RoutinesPage.jsx`, `pages/routines/RoutineEditorPage.jsx`.
- Rutas en `routes/` (`ROUTINES_PATH`, `NEW_ROUTINE`).
- Botón "Asignar rutina" en la ficha (`components/students/profile/`).
- Docs: `docs/tarjetas.md` (fila 26); corregir `contratos-api.md` (`PATCH /routines/:id` no recibe ejercicios, la nota de límites por ejercicio no le aplica).

## 4. Verificación
- `npm run lint` y `npm test` en `frontend/`.
- Tests: utilidades del editor (agregar, quitar, mover, validar, armar bodies, serializar/restaurar borrador); reorden con teclado en la página (mock de `getBoundingClientRect` o vía la función pura) y con Subir/Bajar; validación que bloquea el envío; asignar (body exacto con orden, `template_id`, navegación a la ficha, borrador limpio); usar plantilla (precarga, ejercicio faltante); guardar como plantilla (body con `structure`); borrador (se guarda, se restaura con aviso, descartar, localStorage que tira); listado de rutinas; botón "Asignar rutina" en la ficha.
- **Manual en el navegador** contra el backend real y Supabase dev:
  1. armar una rutina de 6 ejercicios desde la biblioteca;
  2. reordenar arrastrando con el mouse y con el teclado;
  3. configurar series, reps, descanso, peso, tempo y notas;
  4. recargar la página a mitad: el borrador se recupera;
  5. elegir 3 días y asignarla a un alumno → ficha con la rutina activa;
  6. comprobar con `GET /routines/mine` (token del alumno) que llega con los 6 ejercicios en el orden armado;
  7. guardar como plantilla y partir de ella en una rutina nueva;
  8. capturas a 1280 y 375 px en `docs/superpowers/specs/assets/2026-10-25-web-routine-editor/`.

## 5. Fuera de alcance
- Editar rutinas existentes (reordenar/reemplazar ejercicios requiere backend nuevo) → DESEABLES.
- Desactivar otras rutinas del alumno al asignar.
- RIR/RPE, duración estimada y nivel en la rutina.
- Generación con IA (S4).
