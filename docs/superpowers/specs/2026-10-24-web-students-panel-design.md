# Spec — Panel y ficha del alumno en la web

- **Tarjeta:** "7 · Panel y ficha del alumno en la web" (tablero personal de Pablo) → tarjeta de equipo https://trello.com/c/KzZMcFVl ("[S2] Panel y ficha del alumno en la web", tarjeta 23).
- **Fecha:** 2026-10-24
- **Rama:** `feature/web-students-panel`, sale de `develop`.
- **Reglas:** `CONTRIBUTING.md` (200 líneas por archivo, capa → módulo → archivo, tests espejados, ≤ 10 archivos por carpeta) y los specs de la web anteriores (esqueleto, auth/invitaciones, biblioteca), de los que se reutilizan el cliente, React Query, `QueryState` (con `loading`), `Dialog`, `Textarea`, el router con `elements` y el patrón de formularios.
- **Diseño:** prototipo web — E1 Dashboard (`docs/design/prototype-src/pt-dashboard.jsx`), E2 Panel de alumnos (`alumno-web-2.jsx`), E3 Perfil del alumno (`pt-screens.jsx`). Solo se maqueta lo que tiene datos hoy.
- **Producto:** PT-03, PT-04, PT-09; HU-04 (pasar de un alumno a otro en menos de 2 clics; distinguir activos de inactivos), HU-05 (IMC automático con histórico).
- **Backend:** `students` y `body-metrics` (contrato vigente en `docs/arquitectura/contratos-api.md`, módulos Alumnos y Medidas corporales).
- **Sin módulo de sesiones todavía:** `last_session_at` sale de la vista `student_last_session`, pero ningún endpoint escribe sesiones. Hasta la tarjeta de Sessions, todos los alumnos reales van a figurar como "Nunca entrenó".

## 1. Objetivo

La pantalla que más se ve en la demo: el entrenador ve a todos sus alumnos con su último entrenamiento y quién está inactivo, entra a la ficha, ve y carga medidas con la evolución del peso, y completa el contexto (lesiones, equipamiento) que va a usar la IA.

**Criterio de aceptación (de la tarjeta):** el PT ve sus alumnos con la última fecha de entrenamiento, uno aparece marcado como inactivo, entra a la ficha, carga una medida y ve la evolución del peso.

## 2. Decisiones tomadas

### Estados de un alumno (en la web)
- Umbral fijo **N = 7 días** (`INACTIVITY_DAYS`), como el KPI del prototipo ("INACTIVOS > 7D").
- **Al día:** `last_session_at` hace menos de 7 días.
- **Inactivo** (badge rojo `INACTIVO`, bien visible): `last_session_at` hace 7 días o más, **o** nunca entrenó y `created_at` hace 7 días o más.
- **Nuevo:** nunca entrenó y `created_at` hace menos de 7 días.
- **Dado de baja:** `active = false`. Nunca se lo llama "inactivo".
- Texto de última sesión: "Hoy", "Ayer", "Hace N días" o "Nunca entrenó".
- Función pura, testeada aparte; recibe "ahora" como parámetro.

### Dashboard (`/pt/dashboard`, reemplaza el placeholder)
- 3 indicadores (`Stat`): **Alumnos activos**, **Inactivos > 7 días**, **Nunca entrenaron**.
- Card **"Alertas de inactividad"**: los 5 inactivos con más días sin entrenar (se cuentan desde la última sesión o, si nunca entrenó, desde el alta; es el mismo orden que el del panel), con avatar, nombre, "Hace N días" o "Nunca entrenó" y el badge; cada uno lleva a su ficha; "Ver todos" → `/pt/alumnos?estado=inactivos`.
- Sin inactivos: "Todos tus alumnos entrenaron en la última semana".
- Sin alumnos: llamado a la acción "Generá tu primera invitación" → `/pt/alumnos/nuevo`.
- Fuera (sin datos): sesiones por semana, gráfico de actividad, adherencia, RPE, actividad reciente.

### Panel de alumnos (`/pt/alumnos`, reemplaza el placeholder)
- Datos: `GET /students?limit=100` (activos) con React Query; los dados de baja con `?active=false&limit=100` solo cuando se elige ese filtro. Filtrado y orden en el cliente.
- Encabezado: subtítulo de la topbar con contadores ("12 ACTIVOS · 3 INACTIVOS") y botón "Nuevo alumno".
- Filtros: buscador por nombre (sin distinguir mayúsculas ni tildes), **objetivo** (select), **estado** (Todos · Inactivos · Al día · Nuevos · Dados de baja), **orden** (última sesión — más días sin entrenar primero, contando desde el alta si nunca entrenó, con desempate por nombre; es el default —, nombre, alta reciente).
- El estado de los filtros vive en la URL (`?estado=…&objetivo=…&orden=…&q=…`) para que "Ver todos" del dashboard y el volver desde la ficha lo conserven.
- Grilla de tarjetas: avatar con iniciales (tono `hot` si está inactivo), nombre, objetivo, "Última sesión: …", badge de estado (INACTIVO `hot`, NUEVO `cool`, DADO DE BAJA `ghost`) y borde rojo si está inactivo. Toda la tarjeta es un link a la ficha.
- Estados: cargando (skeleton), error con reintento, sin alumnos (llamado a invitar), sin resultados por filtros ("Ningún alumno coincide" + limpiar filtros).
- Fuera (sin datos): adherencia, frecuencia, toggle grilla/lista.

### Ficha del alumno (`/pt/alumnos/:id`)
- Datos: `GET /students/:id` y `GET /students/:id/metrics`.
- **Topbar dinámica:** título = nombre del alumno; subtítulo "ALUMNOS › PERFIL · ÚLTIMA SESIÓN HACE X" (o "NUNCA ENTRENÓ"). Hace falta que una página pueda fijar el título de la topbar.
- **Navegación entre alumnos:** "‹ Anterior", "Siguiente ›" e indicador "3 de 12", con atajos ← y → (no cuando el foco está en un campo). Recorre la lista del panel con los mismos filtros y orden (se pasan por la URL de la ficha: `?estado=…&orden=…`); entrando directo, el orden por defecto de los activos.
- **Columna izquierda:**
  - Avatar grande, nombre, edad (desde `birth_date`) y nivel; pills de estado (en la ficha también AL DÍA, tono `good`; en las tarjetas del panel no) y objetivo.
  - Card **Antropometría** (última medida): peso, talla, % grasa, IMC, cintura, cadera, pecho, cada uno con su diferencia contra la medida anterior (`+0,8 kg`; la del IMC sin unidad). El IMC viene del backend (no se calcula en la web). Sin medidas: "Todavía no hay medidas" + "Cargar medida".
  - Card **Contexto para la IA**: equipamiento y lesiones, con "Editar". Vacíos: aviso "Sin completar: la IA no va a poder personalizar".
- **Columna derecha:**
  - **Evolución del peso:** gráfico de línea con Recharts (`recharts@3.10.1`, versión exacta), con las medidas que tienen peso. Con menos de 2 puntos: texto en lugar del gráfico.
  - **Historial de medidas:** tabla (fecha, peso, IMC, % grasa, cintura) de la más nueva a la más vieja, con "Borrar" y confirmación.
  - **Rutina activa:** nombre y días, o "Sin rutina asignada".
- Acciones: **Editar alumno**, **Cargar medida**, **Dar de baja / Reactivar**.
- Alumno inexistente o ajeno (403 del backend) o `:id` que no es un UUID (400 `VALIDATION_ERROR` sobre `id`): "No encontramos a este alumno" + volver al panel.
- Fuera (sin datos o de otras tarjetas): indicadores de sesiones, evolución de cargas, últimas sesiones con notas (tarjeta 12), "Mensaje" (tarjeta 19), "Asignar rutina" (tarjeta 9).

### Modales (todos con `Dialog`)
- **Editar alumno:** nombre (2–100), objetivo (select), nivel (select, opcional), fecha de nacimiento (date, opcional, no futura). PATCH solo con los campos que cambiaron; sin cambios, se cierra sin request.
- **Contexto para la IA:**
  - Equipamiento: chips para marcar/desmarcar los 7 de la biblioteca (Barra, Mancuernas, Máquina, Polea, Peso corporal, Kettlebell, Banda), guardados como **códigos** (`barbell`…), más "Agregar otro" (texto libre ≤ 50, se suma como chip). Hasta 30 en total. Los valores que no son códigos se muestran tal cual.
  - Lesiones: textarea ≤ 1000 con placeholder "Ej.: lumbalgia, evitar peso muerto pesado".
  - PATCH de `gym_equipment` e `injuries` (vacíos → `null`).
- **Cargar medida:** peso, talla (precargada con la última), % grasa, cintura, cadera, pecho (números ≥ 0, % grasa ≤ 100, al menos uno) y fecha/hora (por defecto ahora; se puede cambiar a una pasada). Se manda con `recorded_at` con zona y un `id` UUID generado en el cliente (idempotencia ante doble envío). Los errores del 400 van a su campo.
- **Borrar medida:** confirmación; 204 → se recarga el historial.
- **Dar de baja:** confirmación "¿Dar de baja a X? No va a poder entrar a la app. El acceso que ya tiene abierto puede seguir hasta 1 hora." → PATCH `active: false`. **Reactivar:** PATCH `active: true` sin confirmación.
- Mientras se guarda, los modales no se cierran (prop `dismissible` del `Dialog`).

### Backend
- `GET /students/:id` suma **`last_session_at`** (timestamp o `null`), del mismo lugar que el listado. Contrato y README actualizados.

### Datos para la prueba
- Las sesiones del E2E se insertan por SQL en Supabase dev (sin commitear); los datos de la demo son de la tarjeta 26.

## 3. Estructura (orientativa)
- `api/students/students.api.js` (`listStudents`, `getStudent`, `updateStudent`), `api/body-metrics/body-metrics.api.js` (`listMetrics`, `createMetric`, `deleteMetric`).
- `hooks/students/` (consultas y mutaciones), `hooks/body-metrics/`.
- `utils/students/` (estado de actividad, textos de última sesión, filtros y orden, navegación anterior/siguiente, edad), `utils/body-metrics/` (diferencias entre medidas, armado del body).
- `components/students/` (tarjeta, filtros, cards de la ficha, modales; subcarpetas si pasan de 10), `components/body-metrics/` (antropometría, gráfico, historial, modal).
- `pages/students/StudentsPage.jsx`, `pages/students/StudentProfilePage.jsx`, `pages/dashboard/DashboardPage.jsx`.
- Topbar dinámica (`components/shared/layout/`): mecanismo para que la página fije título y subtítulo.
- `components/shared/ui/` ya tiene 10 archivos: cualquier primitivo nuevo obliga a subdividirla.
- Backend: `services/students/students.service.js` (`last_session_at` en el detalle) + tests.
- Docs: `contratos-api.md` y `backend/README.md` (`last_session_at` en `GET /students/:id`), `docs/tarjetas.md` (fila 23).

## 4. Verificación
- `npm run lint` y `npm test` en `frontend/` y `backend/`.
- Tests: estado de actividad (bordes de 7 días, nunca entrenó nuevo vs. viejo), filtros/orden, anterior/siguiente; dashboard (indicadores, alertas, vacío); panel (filtros por URL, estados, dados de baja con `active=false`); ficha (topbar dinámica, navegación y flechas, antropometría con diferencias, gráfico con < 2 puntos, cargar medida con `recorded_at` con zona e `id`, borrar, editar con solo lo cambiado, contexto IA con códigos, baja con confirmación, 403 → no encontrado); backend (`last_session_at` en el detalle).
- **Manual en el navegador** contra el backend real y Supabase dev, con un entrenador QA y tres alumnos: uno con sesión de hace 2 días, uno con sesión de hace 10 días (inactivo) y uno nuevo sin sesiones (sesiones por SQL):
  1. dashboard con los indicadores y el inactivo en alertas;
  2. panel con la última sesión de cada uno, el inactivo marcado; filtro "Inactivos";
  3. entrar a la ficha, pasar al siguiente con → y volver;
  4. cargar una medida (y una segunda) y ver el gráfico y las diferencias;
  5. editar el contexto IA con chips y lesiones;
  6. dar de baja y verlo en "Dados de baja"; reactivar;
  7. capturas a 1280 y 375 px en `docs/superpowers/specs/assets/2026-10-24-web-students-panel/`.

## 5. Fuera de alcance
- Foto de perfil (deseable), indicadores y gráficos de sesiones, adherencia, umbral de inactividad configurable por el entrenador, notificaciones de inactividad (cron, otra tarjeta).
- Editar una medida (no hay PATCH: se borra y se vuelve a cargar).
