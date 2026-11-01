---
tags: [spec, tarjeta-50]
---

# Paridad de rol: el alumno en la web — diseño

Tarjeta de equipo **50** ([Trello](https://trello.com/c/Zha3yNu4)) · MIS TAREAS 22 · RNF-15 ("paridad total") · CU-13, CU-14, CU-16, CU-17, CU-18 y CU-20.

## 1. Objetivo y criterio de aceptación

Que un alumno pueda usar la web con la funcionalidad central de la app: rutina del día, registrar un entrenamiento, historial, progreso, logros y medidas. Lo que no llega queda dicho en la documentación, y ninguna pantalla queda rota.

**Criterio:** se entra a la web con una cuenta de alumno y se puede ver la rutina del día, registrar un entrenamiento, ver el historial, el progreso y los logros. Ninguna pantalla queda rota ni vacía sin explicación.

## 2. Decisiones (grilling 01/11)

| # | Decisión |
|---|----------|
| Q1 | Menú del alumno: **Hoy**, **Mis rutinas**, **Historial**, **Mi progreso** (con racha y logros) y **Mi perfil** (con medidas). El **Asistente IA** sale del menú hasta que exista su tarjeta. La **sesión activa** es una página fuera del menú (`/alumno/entrenar`) a la que se entra desde Hoy o Mis rutinas. |
| Q2 | La sesión vive en el navegador (`localStorage`, por alumno) y se sube entera al terminar, con el mismo contrato del celular: `POST /sessions` → series en lotes → nada más (el feedback va en el POST). Los ids los genera el cliente (`crypto.randomUUID`), así que reintentar no duplica. |
| Q3 | Sesión activa simplificada: un ejercicio por vez, peso y reps precargados, Registrar serie y descanso con cuenta regresiva, borrar series antes de subir, Terminar (con confirmación si faltan series), feedback RPE y nota salteable, subida y resumen con los logros desbloqueados. "Continuar" o "Descartar" si quedó una a medias. Fuera de alcance: reemplazar ejercicio, sesión libre y sonido. |
| Q4 | Hoy: saludo, fecha y racha; rutina del día con Empezar; tabla "Plan de hoy"; "Esta semana" (L–D). Distingue descanso de sin rutina con `/routines/mine`. Sin nota del entrenador ni próximo turno. |
| Q5 | Mis rutinas: lista y detalle de solo lectura con "Empezar esta rutina" (o "Continuar la que tenés abierta"). |
| Q6 | Historial: el del PT en modo alumno. Textos en 2ª persona, comentario del entrenador de solo lectura y sin formulario para comentar. |
| Q7 | En Mi progreso: "Tu racha", "Tus logros" (desbloqueados y bloqueados con su avance, vía `/achievements/progress`, que entró con la #45) y "Tus desafíos". En Hoy, la pastilla de racha. Reutiliza los componentes de la #42. Queda fuera sumarse a un desafío. |
| Q8 | Mi perfil: datos de solo lectura ("Para cambiar tus datos, hablá con tu entrenador"), rutina activa, medidas actuales con **Registrar medición**, gráfico de peso e historial. El alumno borra solo las que cargó él. Queda fuera cambiar la contraseña. |
| Q9 | Rama desde `develop`. Los logros van al final: si la #42 ya entró, se trae `develop`; si no, se apila esa tarea sobre su rama y se avisa en la PR. |
| Q10 | Se documenta en `docs/` qué tiene el alumno en la web y qué queda solo en el celular: sesión offline, push, reemplazar ejercicio y pedir turno. El asistente IA queda pendiente en las dos plataformas. |

## 3. Datos (solo frontend; el backend no cambia)

**Endpoints que usa** (todos con el token del alumno; el `studentId` es `user.id`):
- `GET /routines/today` (rutina del día o `null`) y `GET /routines/mine` (rutinas activas).
- `POST /sessions` y `POST /sessions/:id/sets` (lotes de hasta 100). Mismos campos que el celular (`SessionUploader.kt`): la sesión lleva `id`, `routine_id`, `started_at`, `finished_at`, `rpe?` y `notes?`; cada serie lleva `id`, `exercise_id`, `routine_exercise_id`, `set_number`, `actual_reps`, `actual_kg` y `executed_at`, como el celular manda hoy.
- `GET /students/:id/sessions` y `/:sessionId` (historial).
- `/progress/*` (ya en Mi progreso).
- `GET /achievements`, `/students/:id/achievements`, `/students/:id/achievements/progress`, `/students/:id/streak` y `/students/:id/challenges`.
- `GET/POST/DELETE /students/:id/metrics`.
- `GET /students/:id` (perfil propio).

**Sesión en curso (`localStorage`)**, en la clave `ft.workout.<studentId>`:

```
{ id, routineId, routineName, startedAt,
  exercises: [{ routineExerciseId, exerciseId, name, sets, reps, restSeconds, suggestedKg, lastKg }],
  sets: [{ id, exerciseId, routineExerciseId, setNumber, reps, kg, executedAt }],
  cursor,               // índice del ejercicio a la vista
  restEndsAt,           // ISO o null
  feedback: { rpe, notes } | null,
  upload: { sessionCreated, sentSetIds } }
```

- Precarga de la serie 1: peso `lastKg ?? suggestedKg ?? null` y reps del plan. De la serie 2 en adelante: la serie anterior de ese ejercicio.
- Subida:
  1. Se crea la sesión, y si responde 200 o 201 se marca `sessionCreated`.
  2. Se suben las series que faltan en lotes de 100 y se anotan los ids enviados.
  3. Las `failed` del lote no se reintentan y se informan en el resumen.
  4. Si se corta la red o hay un 5xx, se reintenta desde donde quedó.
  5. Al terminar, se borra la clave y se invalidan historial, progreso, racha, logros y rutina del día.
- Los `unlocked_achievements` que lleguen en cualquier respuesta se juntan sin repetir y se muestran en el resumen.

## 4. Pantallas (`frontend/`)

**Navegación:** `STUDENT_NAV` queda con Hoy, Mi progreso, Mis rutinas, Historial y Mi perfil; el Asistente sale. Rutas fuera del menú: `/alumno/entrenar` (sesión activa) y `/alumno/rutinas/:id` (detalle). Si se entra a `/alumno/entrenar` sin una sesión en curso, redirige a Hoy.

**Hoy (A1)**
- Encabezado: "Hola, {nombre}", la fecha en Argentina ("Domingo 1 de noviembre") y la pastilla "RACHA N DÍAS" si la racha es mayor a 0.
- Tarjeta de la rutina del día: día, nombre, "N EJERCICIOS · M SERIES · ~X MIN" (X = Σ series × (descanso + 45 s) / 60, redondeado) y el botón **Empezar entrenamiento**. Si hay una sesión en curso: **Continuar entrenamiento** y "Descartar". Descartar pide confirmación: "¿Descartar el entrenamiento en curso? Se pierden las series registradas".
- "Plan de hoy": una tabla con #, ejercicio, series × reps y peso sugerido (`last_session_kg ?? suggested_kg`, "—" si no hay ninguno).
- "Esta semana": L–D, con los días de la rutina marcados y los entrenados (sesiones terminadas de la semana en Argentina, tomadas del historial) resaltados, más "N de M entrenamientos".
- Sin rutina del día:
  - si `/routines/mine` viene vacío: "Tu entrenador todavía no te asignó una rutina";
  - si no: "Hoy es descanso", con el próximo día de entrenamiento ("Próximo: jueves").

**Sesión activa (A2)**
- Encabezado: "EJERCICIO 3 DE 6 · 22:14 TRANSCURRIDO", Anterior, Siguiente y **Terminar**. Abajo, una barra de segmentos que toca para saltar de ejercicio.
- Ejercicio: el nombre, "SERIE n DE m · SUGERIDO X KG × R" y dos campos grandes de peso (paso de 2,5, con decimales; vacío = peso corporal) y reps (entero de 0 a 1000), con −2,5/+2,5 y −1/+1. Botón **Registrar serie**.
- Tabla "Series" del ejercicio: #, peso, reps y ✕ para borrar, con confirmación.
- Descanso: después de registrar arranca la cuenta regresiva de `restSeconds` (90 s por defecto), con +15″, −15″ y Saltar. Al llegar a 0 muestra "¡A la próxima serie!". Sin sonido.
- Terminar:
  - con series faltantes: "Te faltan N series, ¿terminar igual?";
  - sin ninguna serie: "No registraste ninguna serie. ¿Descartar el entrenamiento?".
- Feedback: "¿Qué tan dura fue?", con RPE de 1 a 10 y las etiquetas de mobile (`RpeTexts.kt`), y "Nota (opcional)" de hasta 1000 caracteres. Botones **Guardar** y **Saltar**.
- Subida: "Guardando tu entrenamiento…". Si falla: "No pudimos guardar tu entrenamiento. Tus series siguen guardadas en este navegador.", con Reintentar.
- Resumen: "¡Entrenamiento guardado!", "N series · X kg · Y min", los logros desbloqueados (si hay), "N series no se pudieron guardar" (si hubo `failed`) y los botones "Ver historial" y "Volver a Hoy".

**Mis rutinas**
- Lista con nombre, días ("Lun · Mié · Vie") y cantidad de ejercicios.
- Detalle: ejercicios en orden con series × reps, descanso, tempo, notas y link al video si tiene. Botón **Empezar esta rutina**; si ya hay una sesión en curso, pasa a "Continuar la que tenés abierta".

**Historial:** el `SessionsHistory` del PT con `viewer="student"`. Cambian los textos ("Todavía no entrenaste", "Tu nota", "Comentario de tu entrenador") y no aparece `SessionComment`.

**Mi progreso:** lo de hoy, más una sección "Racha y logros".
- "Tu racha": actual y récord.
- "Tus logros": los desbloqueados con su fecha, y los bloqueados en gris con su avance, por ejemplo "7/10 sesiones", tomado de `/achievements/progress`.
- "Tus desafíos": activos con barra, más el historial.

**Mi perfil (A5)**
- Avatar, nombre, email, objetivo y nivel, de solo lectura, con "Para cambiar tus datos, hablá con tu entrenador".
- La rutina activa.
- "Medidas actuales" con **Registrar medición** (`MetricFormDialog`), "Evolución del peso" e "Historial de medidas". El ✕ aparece solo en las que tienen `recorded_by = 'student'`.
- Cargar o borrar una medida invalida también `['progress','body',id]`.

**Estados:** cada bloque tiene su carga y su error con Reintentar. No queda ninguna pantalla en blanco.

**Módulos:** `api/routines` y `api/sessions` (las funciones nuevas), `hooks/student/` o por dominio, `utils/workout/` (lógica pura de la sesión y de la subida), `components/workout/`, `components/student/` y `pages/student/`. Archivos ≤ 200 líneas y carpetas ≤ 10.

## 5. Fuera de alcance

- Sesión offline en la web: la sesión está en `localStorage`, pero subirla necesita red.
- Reemplazar ejercicio y sesión libre.
- Sonido o vibración del descanso.
- Editar el perfil o cambiar la contraseña.
- Sumarse a un desafío.
- Pedir turno: en el celular, tarjeta de Igna.
- Mensajes: van en la #47.
- Asistente IA: tarjetas de IA pospuestas.
- Nota del entrenador en Hoy.

## 6. Documentación (en la misma PR)

- `inicio.md`, `propuesta.md`, `requerimientos-no-funcionales.md` (RNF-15), `diagrama-casos-de-uso.md` y `casos-de-uso.md` (CU del alumno: "web y mobile", y la tabla de lo que queda solo en el celular), `plan-de-pruebas.md` (E2E del alumno en la web), `diseno/mockups.md` (A4 pendiente), `tarjetas.md` (fila 50) y el README raíz.

## 7. Pruebas

- **Unit (Vitest):**
  - la lógica de la sesión: precarga, registrar, borrar, cursor, descanso, faltantes;
  - la subida: reintento idempotente, cortes a mitad, `failed` y logros sin repetir;
  - utilidades de la semana y de la duración estimada;
  - Hoy: descanso, sin rutina, en curso;
  - Mis rutinas;
  - el historial en modo alumno (sin formulario de comentario);
  - Mi perfil: el ✕ solo en las medidas propias;
  - los logros: bloqueados con su avance.
- **E2E contra Supabase dev:** la alumna QA ve Hoy, entrena una sesión corta, la ve en el historial y en el progreso y carga una medida. Las capturas van en `docs/superpowers/specs/assets/50/`. La parte visual necesita que Pablo inicie sesión en el navegador; la subida se verifica también por API.

## 8. Ajustes durante la implementación

Lo que cambió respecto de lo de arriba al construirlo (lo implementado manda):

- **Logros bloqueados con su avance:** salen de `/achievements/progress`, que entró con la #45, con la unidad de cada tipo de criterio ("7/10 sesiones").
- **Peso 0 = sin peso:** se decide por campo (`positiveKg(last) ?? positiveKg(sug)`), así que un 0 en `last_session_kg` no tapa al sugerido. Al subir, el peso vacío va como `actual_kg` 0, igual que el celular.
- **Coma decimal en el peso:** el campo acepta "62,5" además de "62.5".
- **409 en `POST /sessions` es permanente** (como en el celular). Ante un error permanente la pantalla ofrece **Descartar entrenamiento** (con confirmación); ante los reintentables, solo Reintentar.
- **Sesión terminada sin guardar:** Hoy ofrece **Terminar de guardar** para retomar la subida.
- **Semana:** el texto es "N de M entrenamientos · +K extra": N = días de la rutina entrenados esta semana, M = días de la rutina y K = días entrenados que **no** son de la rutina (plan L-X-V, entrenó L y S: "1 de 3 entrenamientos · +1 extra").
- **Resumen del entrenamiento:** cuenta las series con reps > 0, igual que el historial.
- **Dialog compartido:** devuelve el foco al elemento que lo tenía al cerrar, en toda la app.
- **QueryState compartido:** muestra el error de pantalla solo si no hay datos; un refetch fallido no tapa lo que ya se cargó (en toda la app; Hoy aplica lo mismo en la semana y el descanso).
- **Rutina del día:** la fecha en Argentina va en la key de la query, así que cambia sola al pasar la medianoche.
- **Módulos:** las utilidades de Hoy viven en `utils/routines/` (no en `utils/student/`) y `greetingDate` en `utils/dates.js`.
- **Logros (Task 6) apilados sobre la #42:** la #42 estaba aprobada sin mergear, así que la rama trae su `origin/feature/web-challenges` y la PR muestra esos commits hasta que se mergee.
- **`/alumno/asistente`** da 404: la ruta salió junto con el menú.
