# Asistente IA del entrenador en la web (tarjeta 16)

MIS 16 · equipo [lF6avaEz](https://trello.com/c/lF6avaEz). Usa el backend de la tarjeta 15 (PR #83, `POST /trainer-ai/generate-routine` y `POST /trainer-ai/save-as-template`; spec `2026-11-06-trainer-ai-design.md`). La rama sale de `feature/trainer-ai`. **Sin mockup:** se arma con los componentes y tokens de la web (Guía Web, Manual de Marca), como el editor de rutinas.

## Decisiones (grilling 06/11 con Pablo)

| # | Pregunta | Decisión |
|---|---|---|
| Q1 | ¿Dónde vive? | **Página propia**, `/pt/rutinas/ia` ("Rutina con IA"). Se entra con **"Generar rutina con IA"** desde la ficha del alumno (`?alumno=<id>`, parámetros precargados) y desde Rutinas (sin alumno: se elige en el formulario). |
| Q2 | ¿Cómo se edita y asigna un split? | **Bloque por bloque.** La vista previa muestra todos los bloques, cada uno con **"Editar y asignar"**: abre el editor con ese bloque y el alumno precargados. Al asignar, vuelve a la propuesta con ese bloque marcado **"Asignado"**. |
| Q3 | ¿Se guarda como plantillas? | **Botón opcional** en la vista previa: "Guardar como plantillas" (pide un nombre). Asignar no depende de eso. |
| Q4 | ¿Cancelar y volver a generar enseguida? | El backend responde 429 "Ya hay una propuesta en curso" con `Retry-After`: la web lo muestra con **cuenta atrás** y el botón deshabilitado hasta entonces. "Armar a mano" está siempre disponible. |

## Pantalla `/pt/rutinas/ia` (rol trainer)

Tres estados en la misma página: **formulario → esperando → propuesta**, más el de error.

**1. Formulario** (todos editables):
- **Alumno:** si vino `?alumno=`, fijo con su nombre y un "Cambiar". Si no, un selector con los alumnos activos del PT. Es opcional: sin alumno se genera una propuesta genérica.
- **Precarga** desde la ficha del alumno (`GET /students/:id`): objetivo, nivel, equipamiento (`gym_equipment`) y lesiones. Solo se pisan los campos que la ficha tiene; lo demás queda como estaba (vacío o lo que el PT ya escribió). Al cambiar de alumno, lo que se había precargado del anterior y el PT no tocó vuelve a vacío.
- Si la ficha no carga por red o servidor (no un 404), el formulario se usa igual sin la precarga y arriba se avisa **"No pudimos cargar los datos del alumno."** con **"Reintentar"**. Solo el 404 es "Ese alumno no está activo o no existe" (en el campo).
- **Lo que manda:** con alumno, `injuries` va siempre (`null` si el PT lo dejó vacío) y `available_equipment` es la lista elegida (puede ser `[]`): el backend completa con el alumno solo lo **ausente**, así respeta lo que el PT borró a propósito (contrato en `docs/arquitectura/contratos-api.md`).
- **Objetivo** y **nivel** (obligatorios, mismos textos que en la ficha), **días por semana** (1 a 7, por defecto 3), **duración por sesión** (20 a 180 min, por defecto 60), **equipamiento** (chips con los 7 valores y los textos en español que ya usa la web), **lesiones** y **preferencias** (texto de hasta 500, con contador).
- Debajo de lesiones, el aviso: **"Esto se le manda a la IA: no pongas datos personales (nombre, DNI, teléfono)."**
- **Partir de una plantilla** (opcional): un selector con las plantillas del PT.
- Validación en el cliente con las mismas reglas que el backend; los errores del 400 se muestran en su campo.
- Botón principal **"Generar propuesta"**.

**2. Esperando** (el LLM tarda de 5 a 20 s, el backend corta a los 30):
- Estado explícito: **"Armando la rutina…"**, con un segundo mensaje que arranca en "Mirando los datos del alumno y tu biblioteca…" (sin alumno, "Mirando tu biblioteca…") y cambia a los 8 s ("Eligiendo ejercicios de tu biblioteca…") y a los 18 s ("Ya casi…"), y los segundos que van (texto visible, con "Segundos transcurridos" solo para lectores de pantalla).
- **"Cancelar"** aborta el pedido (`AbortController`) y vuelve al formulario con los datos intactos.

**3. Propuesta:**
- Arriba, siempre visible: **"Esta es una propuesta de la IA. Revisala y ajustala antes de asignarla."**
- El **porqué** (`rationale`).
- Una tarjeta por **bloque**: nombre, días (L M X J V S D, como el editor) y la tabla de ejercicios **con el mismo formato visual que el editor** (ejercicio, series × reps, descanso, peso sugerido, notas), en modo lectura. En cada bloque, el botón **"Editar y asignar"**, o la marca **"Asignado"** con el link a la ficha del alumno ("Ver la rutina en la ficha de <nombre>"; la web no tiene una página de detalle de rutina del PT). Ya asignado, el bloque muestra **lo que se asignó** desde el editor; si difiere de la propuesta, la marca es **"Asignado · con tus cambios"**.
- Acciones generales: **"Guardar como plantillas"** (diálogo con el nombre, 1 a 120; con varios bloques aclara que se crea una por bloque, "Nombre · Bloque"; al guardar muestra "Guardadas · Las encontrás en "Usar plantilla" del editor" con "Ir al editor" (la web no tiene una página de plantillas); un 409 se muestra como ya guardada), **"Generar otra"** (vuelve al formulario con los mismos datos) y **"Armar a mano"** (al editor vacío, con el alumno si había).

**Error:** un mensaje claro, siempre con salida, nunca un callejón:

| Respuesta | Mensaje | Salidas |
|---|---|---|
| 503 `AI_UNAVAILABLE` o sin red | "El asistente no está disponible ahora." | Reintentar · Armar a mano |
| 502 `AI_INVALID_RESPONSE` | "La IA devolvió una propuesta que no sirve. Probá de nuevo." | Reintentar · Armar a mano |
| 429 `RATE_LIMIT_EXCEEDED` | El mensaje del backend, con cuenta atrás de `Retry-After` (30 s si no vino; el backend lo expone por CORS con `exposedHeaders: ['Retry-After']`) | Reintentar (habilitado al terminar la cuenta) · Armar a mano |
| 404 del alumno o de la plantilla | En el campo correspondiente | Corregir el formulario |

## Del bloque al editor

- La propuesta vive en `sessionStorage` (`fittrainer.ai-proposal.<trainerId>`), junto con los parámetros del formulario y qué bloques ya se asignaron, para que el ida y vuelta con el editor y una recarga no la pierdan. Al leerla se valida la forma (formulario, `generationId`, `proposal.routines` con bloques con `days` y `exercises`): si no cierra, es como no tener sesión. Si cambia el entrenador logueado se lee la suya.
- "Editar y asignar" abre `/pt/rutinas/nueva?alumno=<id>&ia=<generationId>&bloque=<i>`. El editor carga ese bloque igual que una plantilla: nombre ("<nombre del bloque>"), objetivo, días y ejercicios con series, reps, descanso, peso y notas. Lo que no está en la biblioteca actual se avisa como con una plantilla.
- `?bloque=` tiene que ser un entero no negativo: vacío o no numérico no carga ningún bloque (no el 0). Si `?ia=`/`?bloque=` cambian sin desmontar el editor, se vuelve a decidir (y si ya no hay bloque, asignar va a la ficha como siempre).
- **Borrador:** si el PT tiene un borrador sin asignar, antes de reemplazarlo se le pregunta: "Tenés un borrador sin asignar. ¿Reemplazarlo por este bloque?", con "Si lo reemplazás, se pierde lo que armaste a mano." o, si el borrador es otro bloque de la propuesta, "se pierde el bloque "<nombre>" que estabas editando.". Si el borrador ya es ese mismo bloque (una recarga), se recupera sin preguntar.
- Al asignar bien desde un bloque, el editor vuelve a `/pt/rutinas/ia` con el bloque marcado "Asignado". El resto del editor no cambia (validaciones, autoguardado, plantillas, reordenar).
- Sin alumno en la propuesta, el diálogo de asignar del editor lo pide como siempre.

## Entradas

- **Ficha del alumno:** "Generar rutina con IA" junto a "Asignar rutina" (`/pt/rutinas/ia?alumno=<id>`).
- **Rutinas:** "Rutina con IA" junto a "Nueva rutina" (`/pt/rutinas/ia?nueva=1`).
- Las dos entradas abren **siempre el formulario**. Si en `sessionStorage` hay una propuesta sin terminar, arriba del formulario se muestra **"Tenés una propuesta sin terminar"** con **"Verla"** (la muestra). Al ver o generar una propuesta, la URL queda en `/pt/rutinas/ia` sin la marca.
- Sin marca de entrada (`/pt/rutinas/ia` a secas: la vuelta del editor o una recarga) se muestra la propuesta guardada, si hay.

## Código (CONTRIBUTING)

- `api/trainer-ai/` (los dos endpoints, con `signal` para cancelar), `hooks/trainer-ai/` (la mutación de generar con cancelación, guardar y el estado en `sessionStorage`), `utils/trainer-ai/` (precarga desde el alumno, validación del formulario, bloque → estado del editor, mensajes de error), `components/trainer-ai/` (formulario, espera, propuesta, bloque, diálogo de plantillas, error) y `pages/trainer-ai/AiRoutinePage.jsx`.
- La ruta va en `routes/`, con el mismo guard de rol trainer.
- Los links con aspecto de botón usan `buttonClass` de `components/shared/ui/Button.jsx` (mismos estilos que `Button`).
- Hasta que se mergee `fix/web-qa`: en lugar de `useSubmitLock`, la página y el diálogo de plantillas usan un `useRef` local contra el doble envío, y los tests usan un `setupUser` local (`tests/helpers/trainer-ai/aiPage.js`, `userEvent` sin pausa). Al mergear se cambian por los compartidos.
- Archivos de 200 líneas como máximo; carpetas de 10 archivos como máximo.

## Pruebas

- **Vitest con Testing Library**, igual que el resto de la web, con el helper de `userEvent` sin pausa:
  - precarga desde el alumno;
  - validaciones;
  - el aviso de lesiones;
  - generar → propuesta con varios bloques;
  - la espera y sus mensajes con el reloj falso;
  - cancelar aborta y vuelve con los datos;
  - cada error con sus salidas;
  - la cuenta atrás del 429;
  - "Editar y asignar" carga el bloque en el editor, pregunta antes de pisar un borrador y al asignar vuelve con "Asignado";
  - guardar como plantillas (1 bloque y varios, 409);
  - las entradas desde la ficha y desde Rutinas;
  - la propuesta sobrevive a una recarga.
- **En el navegador**, contra el backend local de la 15, con n8n simulado por un servidor local que devuelve una propuesta de 3 bloques y otra de 1, más los casos de error. Es el criterio de la tarjeta: el PT abre un alumno, toca "Generar rutina con IA", ve los parámetros precargados, genera, ve la propuesta, cambia dos ejercicios y la asigna. El alumno la ve en Hoy de la web; el celular lee las mismas rutinas. Capturas en `docs/superpowers/specs/assets/16/`.

## Fuera de alcance

Refinar con una instrucción (`refine`); la prueba con KIMI real (pendiente de Igna, igual que en la 15); el asistente del alumno (tarjeta 13).
