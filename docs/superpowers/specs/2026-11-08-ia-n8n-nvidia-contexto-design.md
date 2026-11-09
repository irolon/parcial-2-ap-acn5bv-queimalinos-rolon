# Spec: IA con n8n en Docker, NVIDIA y más contexto (el "RAG")

- **Autor:** Igna (con Claude Code). Fecha: 08/11/2026.
- **Construye sobre:** PR #83 (`feature/trainer-ai`, asistente del entrenador, tarjeta 15) y PR #85 (`feature/student-ai-chat`, chat del alumno, tarjeta 13), de Pablo. Las specs de esas PRs siguen valiendo: `2026-11-06-trainer-ai-design.md` y `2026-11-07-student-ai-chat-design.md`. Esta spec solo describe lo que se agrega o cambia.
- **Alcance:** n8n y backend. Las pantallas (web y celular) no se tocan: cada uno arma las suyas después.
- **Tablero:** el de Pablo **no se toca** (tarjetas 13, 15 y 16 ni las de equipo). El seguimiento va en el tablero personal de Igna.
- **Actualización 09/11/2026 (prueba real, Tarea 7b):** la capa gratis de NVIDIA no sirvió (los modelos elegidos no respondían y el único rápido fallaba la rutina del profe), así que Igna decidió volver a **KIMI** como proveedor por defecto (`kimi-k3.1-pro`, con el razonamiento apagado). NVIDIA queda como alternativa gratis, configurable por variables. Donde esta spec dice "NVIDIA por defecto", hoy vale KIMI. Detalle y resultados en `n8n/README.md` y en el ADR-008.
- **Actualización 09/11/2026 (tiempos):** con KIMI la mayoría de las respuestas del chat llega en 2 a 7 s, pero Moonshot a veces tarda más de 8 s y esas respuestas se perdían. El chat pasó a cortar en **16 s en el backend (15 s en n8n)**, y la web a los 18 s (#85, `ebeffcb`). El profe no cambia: 30 s en el backend y 25 s en n8n. El RNF-04 (el 95 % de las respuestas en menos de 10 s) sigue igual: el corte es solo para las que se demoran. Esto reemplaza el anti-objetivo de no estirar los tiempos y los 8 s de los criterios y los riesgos.

## Por qué

La IA de FitTrainer es el diferenciador del proyecto. Pablo dejó armados los dos workflows y el backend que los llama, con KIMI (Moonshot) como modelo. Faltan tres cosas para que Igna pueda usarlo y para que las respuestas sean mejores:

1. **n8n no tiene dónde correr.** Levantarlo como servicio del `docker-compose` era tarea de Igna y todavía no está.
2. **KIMI es pago.** En esta etapa se usa la API gratuita de NVIDIA (build.nvidia.com), que es compatible con la de OpenAI.
3. **La IA sabe poco del alumno.** Hoy el profe recibe una rutina armada con el perfil, la biblioteca y las 3 plantillas más recientes, pero la IA no sabe qué viene entrenando el alumno ni qué rutina tiene ahora. En el chat, la IA no sabe qué rutina le toca hoy al alumno.

Igna lo llamó "RAG". Se decidió (ver "Decisiones") que no lleva vectores: todo lo que la IA necesita son datos ordenados que ya están en Supabase, y el backend los lee y se los manda a n8n en el pedido.

## Objetivos

- n8n corre con `docker compose up` al lado de la API, y los workflows y credenciales sobreviven a un reinicio.
- Los dos workflows usan NVIDIA por defecto, y el proveedor y el modelo se cambian sin editar el workflow.
- La propuesta del profe tiene en cuenta lo que el alumno entrenó y su rutina actual: por ejemplo, propone `suggested_kg` a partir de las cargas reales en vez de dejarlo en `null`.
- El chat del alumno conoce la rutina de hoy y no sugiere como reemplazo un ejercicio que el alumno ya tiene en esa rutina.
- Los criterios de aceptación de las tarjetas 13 y 15 se prueban con n8n y NVIDIA de verdad (la "prueba real" que las dos specs de Pablo dejaron pendiente de Igna).

## No objetivos

- Pantallas web o mobile (la tarjeta 16, la E15 y el chat del celular van aparte).
- Vectores, embeddings o pgvector.
- `refine` (sigue fuera de alcance, como en la #83).
- Aplicar una sugerencia del chat a la sesión, o la pantalla con el historial del chat.
- Llevar n8n al VPS (`docker-compose.prod.yml`, tarjeta 21 del tablero de Igna, S7).

## Anti-objetivos (aunque funcione, esto sería un fracaso)

- **Romper los contratos de la API.** `POST /trainer-ai/generate-routine`, `POST /trainer-ai/save-as-template`, `POST /chat` y `GET /chat/today` responden exactamente igual que en la #83 y la #85. La web de Pablo no tiene que cambiar nada. Lo único que crece es el pedido del backend a n8n.
- **Mandar datos personales a la IA (RNF-26).** Nada de nombre, email, fecha de nacimiento, avatar ni ids del alumno. Tampoco nombres de rutinas o plantillas (los profes les ponen el nombre del alumno) ni texto libre que no sea `injuries`/`preferences`: quedan afuera `sessions.notes`, `trainer_comment` y los mensajes con el profe.
- **Que un profe vea datos de otro.** Todo lo nuevo se lee filtrado por el trainer (o por el alumno ya verificado) en los services, como el resto del backend.
- **Que la IA quede más lenta que su timeout.** El chat corta en 16 s en el backend (15 s en n8n) y el profe en 30 s (25 s en n8n). *(Hasta el 09/11 el chat cortaba en 9 s y 8 s; ver la actualización de tiempos.)* Si un modelo no llega, se elige otro antes de volver a estirar los timeouts.

## Decisiones

**Las tomó Igna:**

1. **El "RAG" es contexto leído de la base, sin vectores.** Las fuentes son el perfil del alumno, la biblioteca de ejercicios y lo que armó el profe. Todas son tablas de Supabase y entran enteras (o recortadas) en el prompt.
2. **Lo arma el backend (opción A), no n8n.** El backend verifica el ownership, lee los datos y se los manda a n8n. n8n arma el prompt, llama al modelo y parsea el JSON. n8n no recibe credenciales de la base. Es lo que ya hacen la #83 y la #85, así que se mantiene.
3. **Modelo: la API gratuita de NVIDIA** (`https://integrate.api.nvidia.com/v1`, compatible con OpenAI), para no gastar en esta etapa.
4. **Se construye encima de lo de Pablo**, en un worktree aparte (`C:\Users\igna_\Desktop\fittrainer-ia-rag`, rama `feature/ai-rag-nvidia`, salida de `origin/feature/student-ai-chat` en `66c9e360`). Cuando Pablo mergee la #83 y la #85 se une todo en `develop`.
5. **Alcance: n8n y backend.** Igna hace los dos workflows y el backend de IA. Las pantallas las hace cada uno.
6. **Las series de la sesión en curso no van al chat por ahora** (ver 3b).

**Las tomó Claude (Igna las revisa al leer esta spec):** están marcadas con *(Claude)* en cada parte.

## Parte 1: n8n en el `docker-compose`

- Servicio `n8n` en `docker-compose.yml`, al lado de `api`. Imagen `n8nio/n8n` con **versión fija** (la estable que tenga al menos dos semanas; nunca `latest`), puerto `5678`, volumen con nombre para `/home/node/.n8n` (workflows, credenciales y ejecuciones) y `restart: unless-stopped`.
- Variables del servicio en `n8n/.env` (en `.gitignore`), con `n8n/.env.example` commiteado:
  - `N8N_ENCRYPTION_KEY`: fija, para que las credenciales se puedan leer después de recrear el contenedor.
  - `GENERIC_TIMEZONE` y `TZ` en `America/Argentina/Buenos_Aires`.
  - `N8N_SECURE_COOKIE=false`, porque en local se entra por `http://localhost:5678`.
  - `LLM_BASE_URL`, `LLM_TRAINER_MODEL`, `LLM_STUDENT_MODEL` (Parte 2).
  - Lo que haga falta para que los nodos Code puedan leer `$env` (en algunas versiones de n8n viene bloqueado: `N8N_BLOCK_ENV_ACCESS_IN_NODE`). El builder lo verifica con la versión elegida.
- `./n8n/workflows` se monta **de solo lectura** en el contenedor, para importar con un comando *(Claude)*: `docker compose exec n8n n8n import:workflow --separate --input=<carpeta montada>`. Las credenciales se siguen creando a mano en la UI, como dice el README de Pablo, porque no se versionan.
- `api` **no depende** de `n8n` (`depends_on` no). La app tiene que arrancar sin IA y responder 503 cuando n8n no está, como hoy.
- **No romperle el `docker compose up` a Pablo** *(Claude)*: el `env_file` de n8n es opcional (si falta `n8n/.env`, n8n arranca con los valores por defecto) y el puerto del host se puede cambiar (`N8N_PORT`, como `API_PORT`).
- Con los dos en Docker, el backend usa `N8N_TRAINER_AI_WEBHOOK_URL=http://n8n:5678/webhook/trainer-ia` y `N8N_STUDENT_AI_WEBHOOK_URL=http://n8n:5678/webhook/student-ia`. El README de Pablo ya tiene esas líneas comentadas en el `.env` de ejemplo.

## Parte 2: el modelo, con NVIDIA por defecto

- En los dos workflows, la credencial `KIMI` pasa a llamarse **`LLM`** (Header Auth, `Authorization: Bearer <key>`). Los nodos se renombran a **"LLM chat completions"** y **"Responder error LLM"**. Los códigos de error que ve el backend no cambian: `LLM_UNAVAILABLE` e `INVALID_JSON` ya son genéricos.
- **La URL y el modelo salen de variables de n8n, no del código del nodo** *(Claude)*. El nodo "Armar prompt" lee `LLM_BASE_URL` y `LLM_TRAINER_MODEL` (o `LLM_STUDENT_MODEL` en el chat) con un valor por defecto de NVIDIA si no están o si `$env` está bloqueado, y pasa la URL al nodo HTTP en su salida. Así, para volver a KIMI alcanza con cambiar las variables y la credencial, y los JSON del repo quedan iguales para Igna y para Pablo.
- **`response_format: { type: "json_object" }`:** se conserva si el modelo de NVIDIA lo acepta. Si lo rechaza (400), se saca, y el JSON se pide solo en el prompt. El nodo "Parsear JSON" ya limpia los ```` ``` ```` y el backend valida igual.
- **Elegir el modelo** (lo hace el builder): probar 2 o 3 modelos del catálogo de NVIDIA con los `curl` del README (más un caso con historial, Parte 3). Para cada uno se mira:
  - **JSON:** cuántas respuestas pasan la validación del backend. La meta es 10 de 10 en el chat y al menos 9 de 10 en el profe.
  - **Español:** que se lea rioplatense neutro y natural.
  - **Latencia:** el chat tiene que contestar en menos de 15 s (el 95 % en menos de 10 s, RNF-04) y el profe en menos de 25 s.

  Puede salir un modelo para cada workflow. Los resultados se anotan en `n8n/README.md`.
- **Límites de la capa gratis:** según fuentes no oficiales, unas 40 consultas por minuto por cuenta. Hay que confirmarlo en build.nvidia.com y anotarlo en el README. Para desarrollo y demo alcanza. Los límites propios del backend (20 por hora por profe, 20 por día por alumno) no cambian.
- **Datos:** con usuarios de prueba no hay problema. En el README queda escrito que, antes de usar datos reales, hay que revisar los términos de uso de NVIDIA.

## Parte 3: más contexto para la IA

Todo se suma al pedido que el backend le manda a n8n, con las mismas reglas que ya usa Pablo: sin datos personales, recortado a un tope y leído por lote, sin consultas N+1. Los topes de abajo son *(Claude)*. Van como constantes en los `models/` de cada módulo, para poder ajustarlos.

### 3a. Asistente del profe (`trainer-ia`)

**Solo cuando el pedido trae `student_id`** (alumno activo del trainer, ya verificado por `resolveParams`):

- **`student_history`**: resumen de las sesiones **terminadas** de los últimos **28 días**:
  - `sessions_per_week`: sesiones por semana desde la primera de la ventana (mínimo 1 semana, máximo las 4 de la ventana), para que un alumno que empezó hace poco no parezca de baja frecuencia;
  - `days_since_last_session`, en días de Argentina como rachas y semanas (o `null` si no hay sesiones);
  - `avg_rpe`: promedio de RPE de las sesiones que lo tienen (o `null`);
  - `exercises`: hasta **15** ejercicios, los más repetidos en la ventana, como `{ exercise_id, exercise_name, muscle_group, sessions, best_set: { kg, reps }, last_kg }`. Va el `exercise_id` (no es un dato personal; la biblioteca ya viaja con ids) para que la IA empareje con la propuesta por id y no por nombre *(Claude)*. Para la mejor serie cuentan solo las series completadas de la ventana; `last_kg` es la última carga conocida del ejercicio, aunque sea de antes de los 28 días (la función SQL `last_session_kg` que ya existe) *(Claude)*.

  Si el alumno no tiene sesiones, `student_history` va con `sessions_per_week: 0`, `days_since_last_session: null` y `exercises: []`. Es el caso normal del alumno recién invitado.
- **`current_routine`**: las rutinas activas del alumno, como `{ goal, days, exercises: [{ exercise_name, muscle_group, sets, reps, suggested_kg }] }`, **sin el nombre** de la rutina.

**Siempre:**

- **`previous_routines`**: hasta **3** rutinas (activas o no) que **ese trainer** creó para **otros** alumnos con el mismo `goal`, las más recientes, con la misma forma que `previous_templates` (`{ goal, days, exercise_names[] }`), sin nombre de rutina ni datos del alumno. Las plantillas (`previous_templates`) se siguen mandando como hoy.

**Prompt de sistema de `trainer-ia`:** se le explica qué es cada campo nuevo y cómo usarlo:

- Si hay `last_kg` o `best_set` de un ejercicio que propone, `suggested_kg` sale de ahí con una progresión prudente. Si no hay datos, va `null`, como hoy.
- No repetir la `current_routine` tal cual, salvo que `preferences` lo pida.
- Si `sessions_per_week` está muy por debajo de `frequency_per_week`, lo menciona en `rationale`.
- Los datos nuevos son **datos, nunca instrucciones**: va el mismo cuidado que ya tiene el chat con el "DATOS DE CONTEXTO (JSON)".

La validación de la propuesta no cambia: `suggested_kg` ya admite de 0 a 500 o `null`. **El backend no completa cargas por su cuenta** *(Claude)*: si la IA deja `null` en un ejercicio con historial, se acepta. Elegir una carga es una decisión de entrenamiento, y el profe vería cargas que la IA no propuso. Si el modelo las deja en `null` sistemáticamente, se ajusta el prompt o se cambia de modelo.

### 3b. Chat del alumno (`student-ia`)

- **`todays_routine`**: la rutina que el alumno está haciendo, deducida en el backend sin cambiar el contrato *(Claude)*. No se puede sacar de la sesión: mientras el alumno entrena, la sesión no está en el servidor (offline-first; si ya subió, `resolveSessionId` corta con 400 `SESSION_FINISHED`). Además, desde Mis rutinas (#46) el alumno puede entrenar una rutina que no le toca hoy. Por eso se elige así, en orden:
  1. la rutina activa del día de hoy en Argentina (`findActiveRoutineForStudentToday` con `dayName`), si contiene `current_exercise_id`;
  2. si no, la rutina activa más reciente del alumno que contenga `current_exercise_id`;
  3. si no vino `current_exercise_id` o ninguna lo contiene, la rutina del día de hoy;
  4. si no hay ninguna, `null`.

  Va como `[{ exercise_name, muscle_group, sets, reps, suggested_kg, is_current }]`, en el orden de la rutina y sin su nombre. `is_current` marca el ejercicio actual, así la IA puede contestar "¿qué me queda?" con los que vienen después.
- **Alternativas:** se sacan de `alternatives` los ejercicios que ya están en `todays_routine` *(Claude)*. Así el filtro lo hace el backend y no depende de que la IA obedezca. Si no queda ninguna, la IA contesta sin sugerencias: ya se admiten de 0 a 3.
- **Prompt de sistema de `student-ia`:** se le explica `todays_routine`, para responder cosas como "¿qué me queda?" sobre la rutina del día y para cuidar que un reemplazo no recargue un músculo que la rutina ya trabaja ese día.
- **Lo que el alumno ya hizo en la sesión de hoy queda afuera por ahora** (decisión de Igna, 08/11). La sesión es offline-first y llega al servidor recién al terminar, así que el backend no ve esas series mientras el alumno entrena. Para mandarlas habría que sumar un campo opcional en `POST /chat`, que ningún cliente usaría todavía. Para ubicarse en la rutina alcanza con `is_current`. Se puede sumar cuando Igna arme el chat en el celular.

## Contratos y documentación

- **API:** sin cambios (ver anti-objetivos).
- **Pedido backend → n8n:** suma `student_history`, `current_routine` y `previous_routines` en `trainer-ia`, y `todays_routine` en `student-ia`. Se documenta en `n8n/README.md` con los `curl` actualizados.
- **Documentos que se actualizan en la misma PR:**
  - `n8n/README.md`: Docker, credencial `LLM`, variables, NVIDIA, modelos probados y payload.
  - `docs/proceso/setup-tecnico.md`: levantar n8n con el compose e importar los workflows.
  - `docs/arquitectura/adrs.md`: un ADR nuevo, "Contexto de la IA desde la base (sin vectores) y modelo configurable", que complementa el ADR-004.
  - `backend/README.md`: el aviso a Pablo, como siempre (qué cambió en sus workflows y en su contexto, y que tiene que crear la credencial `LLM`).
- Las specs de Pablo no se editan: esta las referencia.

## Código

- Regla de 200 líneas y orden capa → módulo → archivo (AGENTS.md y CONTRIBUTING). Lo nuevo de `trainer-ai` va en `repositories/trainer-ai/` y `services/trainer-ai/`, y lo del chat en `repositories/chat/` y `services/chat/`. Se reusan los repositorios que ya existen (`routines`, `sessions`, `session-history`, `progress`) en vez de duplicar consultas. Si `context.service.js` de `trainer-ai` pasa las 200 líneas, se divide en una carpeta propia.
- El JS de los nodos Code no lo cubre el chequeo de largo (va adentro del `.json`), pero se mantiene cerca del tamaño actual (unas 90 líneas por nodo).
- El export de los workflows sigue las reglas del README de Pablo: credenciales solo por nombre, `"active": false` y `"pinData": {}`.

## Pruebas

- **Unitarias (backend):**
  - el resumen del historial: sin sesiones, con sesiones, series no completadas que no cuentan, tope de 15, ventana de 28 días, promedio de RPE con `null`;
  - `current_routine` y `previous_routines` (solo de ese trainer, otro alumno, mismo `goal`, tope de 3, sin nombres);
  - `todays_routine` en cada caso del orden (la de hoy con el ejercicio, otra rutina activa con el ejercicio, sin ejercicio, ninguna), con `is_current` bien marcado, y alternativas sin los ejercicios de la rutina;
  - **contexto sin PII**: el payload no trae nombre, email, nacimiento, ids del alumno, nombres de rutinas o plantillas, `notes` ni `trainer_comment`;
  - sin `student_id`, `trainer-ia` no lee historial ni rutina actual.
- **Los tests de la #83 y la #85 siguen pasando** (la base es 184 suites y 1697 tests en `66c9e360`), con `npm run lint` y `npm test` en `backend/`.
- **Prueba real con n8n en Docker y NVIDIA** (la que quedó pendiente de Igna en las dos specs):
  1. `docker compose up`, importar los dos workflows, crear las credenciales y activarlos;
  2. el profe genera una rutina para un alumno con historial (usuarios de prueba de Supabase dev) y la propuesta pasa la validación, con `suggested_kg` cargado en la mayoría de los ejercicios que el alumno ya hizo;
  3. para un alumno sin historial la propuesta sale igual;
  4. durante una sesión, "¿con qué reemplazo el press de banca?" devuelve una alternativa coherente con el equipamiento del alumno que no está en su rutina de hoy;
  5. con n8n apagado, el mensaje amable llega en menos de 10 s y la sesión sigue.

  Se anotan los tiempos y el modelo elegido.

## Rama, PR y coordinación

- La rama `feature/ai-rag-nvidia` sale de la de la #85, que incluye la #83. La PR va con base `feature/student-ai-chat` y, cuando Pablo mergee, la base cambia a `develop`. Si Pablo sigue empujando a la #85, se trae su rama antes de abrir la PR.
- Esta PR toca archivos de las PRs de Pablo (los dos JSON de n8n y los `context.service`). Hay que avisarle antes de abrirla, para que no edite lo mismo en paralelo.
- El commit, el push y la PR los hace Igna. La auditoría de Codex va en una tarjeta del tablero personal de Igna.

## Lo que queda a criterio del builder

La versión de n8n, el modelo de NVIDIA de cada workflow (con los criterios de la Parte 2), la redacción de los prompts, la forma exacta de las consultas (por lote, reusando los repositorios) y cómo partir los archivos para respetar las 200 líneas.

## Riesgos

- **NVIDIA lento o con JSON flojo en la capa gratis.** Se mitiga probando modelos y eligiendo uno por workflow. Si ninguno sirve para el chat en 15 s, se avisa a Igna antes de cambiar nada.
- **`$env` bloqueado en la versión de n8n.** Se mitiga con valores por defecto en el código y con la variable del contenedor.
- **Choque con cambios nuevos de Pablo en la #85.** Se mitiga avisándole y trayendo su rama antes de la PR.

## Preguntas abiertas

Ninguna. La única que había (las series de la sesión de hoy en el chat) la resolvió Igna: quedan afuera por ahora (ver 3b).
