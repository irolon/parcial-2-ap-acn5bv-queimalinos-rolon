# Spec — Biblioteca de ejercicios en la web

- **Tarjeta:** "6 · Biblioteca de ejercicios en la web" (tablero personal de Pablo) → tarjeta de equipo https://trello.com/c/rCks8PTo ("[S2] Biblioteca de ejercicios en la web", tarjeta 21).
- **Fecha:** 2026-10-24
- **Rama:** `feature/web-exercises-library`, sale de `develop`.
- **Reglas:** `CONTRIBUTING.md` (200 líneas por archivo, capa → módulo → archivo, tests espejados) y los specs del esqueleto (`2026-10-18-web-skeleton-design.md`) y de auth e invitaciones (`2026-10-18-web-auth-invitations-design.md`), de los que se reutilizan el cliente, los estados, los componentes y el patrón de formularios.
- **Diseño:** no hay pantalla de biblioteca maquetada. Se toma el estilo de la biblioteca lateral de "Crear rutina" (`docs/design/prototype-src/pt-screens.jsx`, Guía Web p.13): buscador, chips en pill mono, miniatura rayada con ícono de video. El ítem "Biblioteca" del sidebar ya existe (`/pt/biblioteca`).
- **Backend:** módulo `exercises` de `develop` (`GET/POST /exercises`, `PATCH/DELETE /exercises/:id`, solo trainer; ownership en el service).
- **Producto:** HU-09 y HU-10 (`docs/producto/propuesta.md`), CU-06.

## 1. Objetivo

El entrenador explora la biblioteca (50 globales + los suyos), la filtra al instante por músculo, equipamiento y nombre, y da de alta, edita y borra sus propios ejercicios con video.

**Criterio de aceptación (de la tarjeta):** el PT filtra por "pecho" y ve solo ejercicios de pecho. Crea uno propio con video y aparece en la grilla con su badge. En los globales no hay botón de editar (ni de borrar).

## 2. Decisiones tomadas

### Datos y filtrado
- Una sola consulta con React Query: `GET /exercises` (sin query params) trae globales + propios; todo el filtrado es en el cliente, sin requests por tecla.
- La consulta vive en `hooks/exercises/` y la función de filtrado en `utils/exercises/`; ninguna depende de la página, para que la tarjeta 9 (editor de rutinas) arme su panel lateral sobre lo mismo. El panel no se construye acá.
- Filtros combinables:
  - **Grupo muscular:** chips de selección única, "Todos" + solo los grupos que tienen al menos un ejercicio, en el orden de `MUSCLE_GROUPS`. Si el grupo elegido deja de tener ejercicios, vuelve a "Todos" (igual que mobile).
  - **Equipamiento:** `<Select>` con "Todo el equipamiento" + los 7 valores.
  - **Origen:** segmentado "Todos · Propios · Globales".
  - **Buscador** por nombre ("Buscar ejercicio…"): sin distinguir mayúsculas ni tildes.
- Orden: el del backend (por nombre).

### Etiquetas en español
- Músculos (las mismas que mobile): chest Pecho, back Espalda, shoulders Hombros, legs Piernas, glutes Glúteos, biceps Bíceps, triceps Tríceps, core Core, calves Gemelos, full_body Cuerpo completo, cardio Cardio.
- Equipamiento: barbell Barra, dumbbell Mancuernas, machine Máquina, cable Polea, bodyweight Peso corporal, kettlebell Kettlebell, band Banda.
- Un código desconocido se muestra tal cual. Al editar un ejercicio con equipamiento fuera de la lista, el select arranca vacío.

### Pantalla (`/pt/biblioteca`, entrenador)
- Encabezado: contador "N EJERCICIOS" y botón primario "Nuevo ejercicio".
- Barra de filtros arriba; grilla de tarjetas responsive (1 columna en mobile).
- Tarjeta: miniatura (YouTube → `https://img.youtube.com/vi/<id>/hqdefault.jpg`; si no es YouTube o no hay video, el placeholder rayado con ícono de video), nombre, "PECHO · BARRA" en mono, badge **PROPIO** (`Pill` tono `cool`) en los propios, y en los propios íconos de editar y borrar. Los globales no muestran ninguno de los dos.
- Tocar la tarjeta abre el **detalle** en un diálogo: grupo, equipamiento, descripción, botón "Ver video" (abre en otra pestaña, `rel="noopener noreferrer"`) y, si es propio, editar y borrar.
- Estados: cargando (skeleton de la grilla), error (con reintento), vacío en "Propios" ("Todavía no creaste ejercicios propios" + botón "Nuevo ejercicio"), sin resultados por filtros ("Ningún ejercicio coincide" + "Limpiar filtros").

### Crear y editar (modal)
- `Dialog` de shadcn (Radix): foco atrapado, Escape, `aria`. Se suman `Dialog` y `Textarea` a `components/shared/ui/`.
- Campos: nombre\* (2 a 120), grupo muscular\* (select), equipamiento (select, opcional), descripción (textarea, hasta 1000), URL del video (opcional, http/https, hasta 500).
- Validación en el cliente con los mismos límites; los errores del 400 del backend (`details[{field,message}]`) se muestran debajo de cada campo con `fieldErrorsFrom`.
- Editar usa el mismo modal precargado, título "Editar ejercicio". El PATCH manda todos los campos; un opcional vacío va como `null` (así se puede quitar el video o el equipamiento).
- Al guardar: se cierra el modal y se invalida la consulta; el ejercicio aparece en su lugar alfabético.
- Nombres repetidos se permiten (el badge los diferencia).

### Borrar
- Confirmación en un diálogo ("¿Borrar «X»?", botón `danger`).
- Si el ejercicio está en una rutina o en el historial, el backend responde 409 y el diálogo muestra el mensaje sin cerrarse.

### Backend (cambio de contrato)
- `equipment`: uno de `EQUIPMENT` o `null` (POST y PATCH); si no, 400 con `field: 'equipment'`.
- `video_url`: URL válida que empieza con `http://` o `https://`, hasta 500 caracteres; si no, 400 con `field: 'video_url'`.
- `description`: hasta 1000 caracteres; si no, 400 con `field: 'description'`.
- `DELETE /exercises/:id` de un ejercicio referenciado (`23503`, clave foránea): **409 `EXERCISE_IN_USE`** "No podés borrar este ejercicio porque está en una rutina o en el historial de un alumno". Hoy es un 500.
- La base de dev no tiene datos que violen las reglas nuevas (50 globales con equipamiento de la lista, URLs https, descripción máx. 143).
- `/exercises/library` (mobile) no cambia.

### Router
- `roleSection` hoy mapea todos los ítems del nav a `PlaceholderPage`. Se cambia para que un ítem pueda tener su página real (mapa `path → elemento`), sin duplicar la ruta, y `/pt/biblioteca` usa la página nueva.

## 3. Estructura (orientativa)
- Backend: `validations/exercises/exercises.validation.js`, `services/exercises/exercises.service.js` (409), `shared/utils/errors.js` (`exerciseInUse`), tests espejados.
- Web:
  - `api/exercises/exercises.api.js` (`list`, `create`, `update`, `remove`).
  - `hooks/exercises/` (consulta y mutaciones).
  - `utils/exercises/` (funciones puras: opciones y etiquetas, formulario, URL de video, filtrado).
  - `components/exercises/` (filtros, tarjeta, grilla, detalle, formulario, confirmación de borrado, miniatura).
  - `pages/exercises/ExerciseLibraryPage.jsx`.
  - `components/shared/ui/Dialog.jsx`, `Textarea.jsx`.
  - `routes/` (router).
- Docs: `docs/arquitectura/contratos-api.md` (GET/POST/PATCH/DELETE con validaciones y errores), `backend/README.md` (endpoints), `docs/tarjetas.md` (fila de la tarjeta 21).

## 4. Verificación
- `npm run lint` y `npm test` en `frontend/` y `backend/`.
- Tests:
  - backend: equipamiento, URL y descripción inválidos → 400 con su campo; borrar en uso → 409; `null` permitido en PATCH;
  - filtrado (músculo, equipamiento, origen, búsqueda sin tildes, combinados, grupo que desaparece → "Todos");
  - miniatura (URLs de YouTube `watch`, `youtu.be`, `shorts`; otras → placeholder);
  - página: carga, error, vacío de propios, sin resultados; globales sin editar/borrar; crear (éxito → aparece con badge; 400 en su campo); editar (PATCH con `null`); borrar (confirmación; 409 visible);
  - router: `/pt/biblioteca` muestra la biblioteca y el nav no cambia.
- **Manual en el navegador**, contra el backend real y Supabase dev, con el entrenador QA:
  1. abrir Biblioteca: 50 globales, sin editar/borrar;
  2. filtrar por Pecho → solo pecho; combinar con equipamiento y buscador;
  3. crear "QA card6 <fecha>" con video de YouTube → aparece con badge PROPIO y miniatura;
  4. editarlo quitando el video → placeholder;
  5. borrarlo;
  6. estado vacío en "Propios";
  7. capturas a 1280 y 375 px en `docs/superpowers/specs/assets/2026-10-24-web-exercises-library/`.

## 5. Fuera de alcance
- Panel lateral de la biblioteca en el editor de rutinas (tarjeta 9).
- Subida de videos a Storage y reproductor embebido.
- Archivar ejercicios en uso en vez de bloquear el borrado (deseable).
- Etiquetas de equipamiento en mobile: se le pasan a Igna en la PR.
