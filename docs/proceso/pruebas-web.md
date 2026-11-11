# Pruebas de la web

Tarjeta 53 (equipo, parte web) · MIS 25. Spec: `docs/superpowers/specs/2026-11-05-web-qa-design.md`. La app Android la prueba Igna en su parte de la misma tarjeta.

**Entorno (05/11):** backend y web locales (rama `fix/web-qa` sobre `develop` 766ae0f) contra Supabase dev, a 1366×768 y 1280×720. Dos vueltas:
- **Primera (flujos y condiciones):** en el navegador integrado de la app de escritorio, con las cuentas `it.webmw3lthaf.*@test.fittrainer.dev`: el PT Martina con Lucía (rutina de los 7 días y una sesión) y Pedro (sin rutina), y el PT Laura, registrada desde la web, con Sofía, dada de alta desde la web.
- **Segunda (checklist por pantalla, internet lento, refresh fallido y capturas):** con Edge sin ventana manejado por CDP, para medir y capturar siempre igual, con las cuentas `it.webmw3sl5rm.*` (Martina, Lucía y Pedro, como arriba). Entre la web y el backend, un proxy local de QA (no se commitea) que agrega un retardo a cada request o hace fallar `POST /auth/refresh` a pedido; el backend con `JWT_EXPIRES_IN=60s`.

Las cuentas se borran con `npm run test:integration:clean`. Lo que en la realidad hace el celular se simuló por la API con los mismos requests que manda la app. Capturas en `docs/superpowers/specs/assets/53/`.

Resultado: ✅ pasa · ⚠️ pasa con observaciones · ❌ falla · ➖ no está en la web.

## 1. Flujos críticos

| # | Flujo | Web | Lado del celular (simulado por la API) | Resultado |
|---|---|---|---|---|
| F1 | Registro del PT → invitación → alta del alumno | Registro (validaciones de nombre, email y contraseña), dashboard vacío con "Generá tu primera invitación", invitación con QR y link de 48 h (copiar, WhatsApp, descargar), alta desde el link (contraseñas distintas → "Las contraseñas no coinciden"), el alumno entra a Hoy. El mismo link otra vez → "Esta invitación ya fue utilizada". | — | ✅ (B1, B2) |
| F2 | Armar rutina → asignarla → verla | Editor: biblioteca con filtros, 3 ejercicios, 7 días, peso "22,5" con coma; Asignar → Sofía; la ficha muestra "Rutina activa". | `GET /routines/mine` y `/routines/today` del alumno: los 3 ejercicios, 7 días, `suggested_kg` 22.5. | ✅ (B4) |
| F3 | Entrenar completo → sincronizar → verlo en la web | La alumna entrena desde la web: registra series, termina con RPE, ve el resumen ("3 series · 602,5 kg") y el logro. El PT ve la sesión en la ficha y en el detalle. | Sesión con UUID del cliente, lote de 9 series, cierre con RPE 8 y nota: aparece en la ficha del PT con racha 1 y el logro "Primera sesión". | ✅ (B5) |
| F4 | Entrenar sin conexión → reconectar → no se pierde nada | Backend apagado a mitad de la sesión: las series se siguen registrando; al terminar, "No pudimos guardar tu entrenamiento. Tus series siguen guardadas en este navegador" con Reintentar; con el backend de vuelta, Reintentar guarda **3 series, sin duplicados** (verificado por la API), y el botón no deja un doble envío. Recargar con el backend caído muestra "Sin conexión con el servidor" (reintenta solo, sin pedir login) y no se pierden las series; con el backend de vuelta entra a la misma sesión: ver B6. | Series con `executed_at` de 3 h antes y el **mismo lote mandado dos veces**: 9 creadas la primera vez, 0 la segunda. | ✅ (B6) |

## 2. Condiciones feas

| Condición | Qué se hizo | Resultado |
|---|---|---|
| Backend caído a mitad de la sesión | Ver F4. | ✅ |
| Recargar a mitad de la sesión | Con el backend arriba: vuelve al ejercicio, las series y el descanso en curso. Con el backend caído: "Sin conexión con el servidor" con la cuenta atrás del reintento; al volver el backend, la misma pantalla de la sesión con las series guardadas (GX9 c, B6). | ✅ (B6) |
| Sesión vencida, refresh que anda | `JWT_EXPIRES_IN=60s`, 70 s de espera y navegación: `401` → `POST /auth/refresh` 200 → reintento 200, sin que la alumna note nada. | ✅ |
| Sesión vencida, refresh que falla | Sesión de entrenamiento con 2 series registradas; el proxy hace fallar el refresh y pasan 65 s sin tocar nada: el polling de mensajes recibe el `401`, el refresh falla y la web lleva sola al login. Las 2 series siguen en el navegador; al volver a entrar, la alumna cae en la sesión en "Serie 3 de 3" con las dos series. Capturas `refresh-01` a `refresh-03`. | ✅ |
| Internet lento | 2,5 s de retardo en cada request: Hoy, Mi progreso e Historial muestran el esqueleto de carga (nunca una pantalla en blanco ni un error) y terminan en 7,5 a 10,5 s, porque restaurar la sesión y traer los datos van en cadena (`lento-01-hoy-cargando`). En el chat, un doble click real en Enviar y dos Enter seguidos mandan un solo mensaje cada uno (verificado por la API). | ✅ |
| Dos pestañas | La misma sesión de entrenamiento abierta en dos pestañas: una serie registrada en la B aparece sola en la A; al terminar en la B ("2 series · 592,5 kg"), la A vuelve a Hoy con la sesión cerrada y la racha en 2. Una sola sesión guardada. | ✅ |
| Polling | `messages/unread-count` cada 15 s por pestaña y solo con la pestaña visible (`refetchIntervalInBackground: false`). | ✅ |
| Notebook chica | Las 6 pantallas del alumno y las 10 del PT a 1366×768, y las 4 del PT con tablas o grillas (editor, ficha, agenda, biblioteca) también a 1280×720: ninguna con scroll horizontal (`scrollWidth` = `clientWidth`) y la acción principal adentro de la primera pantalla, sin scrollear (medido con `getBoundingClientRect`). La lista de ejercicios del editor scrollea adentro de su columna, a propósito. | ✅ |
| Guards de rol | Alumna en `/pt/dashboard`, `/pt/alumnos`, `/pt/rutinas/nueva`, `/pt/agenda` → `/alumno/hoy`. PT en `/alumno/hoy`, `/alumno/entrenar`, `/alumno/perfil` → `/pt/dashboard`. | ✅ |
| Batería, giro de pantalla, app en segundo plano | Son del celular: no aplican a la web (Igna, tarjeta 53). | — |

## 3. Checklist por pantalla (Guía Web, p. 5–15)

Cada funcionalidad numerada de la guía contra la web de hoy. ➖ es lo que la guía muestra y la web todavía no tiene: no es un bug, son cosas que ninguna tarjeta implementó (o que se decidieron distinto), y quedan listadas para el tablero.

**Alumno**

| Pantalla | Funcionalidad de la guía | Resultado | Captura |
|---|---|---|---|
| A1 Hoy | Rutina del día resuelta por el sistema | ✅ "Hoy · Jueves · Fuerza QA" sin elegir nada | `al-01-hoy` |
| | Tabla completa de ejercicios | ✅ Ejercicio, series × reps y peso sugerido | |
| | Columna de contexto (semana, nota del PT, próximo turno) | ⚠️ La semana con los días entrenados y la racha; la nota del PT y el próximo turno no están en Hoy | |
| | Un solo CTA primario | ✅ "Empezar entrenamiento" | |
| A2 Sesión activa | Ejercicio actual a la izquierda, registro en dos pasos | ✅ Peso y reps grandes con ajustes ±2,5 / ±1 y "Registrar serie" | `refresh-01-sesion-en-curso` |
| | Registro de series a la derecha | ✅ Tabla de series con la que sigue | |
| | Temporizador siempre visible | ✅ El descanso arranca solo al registrar, con +15 s y saltar | |
| | Carga sugerida antes del registro | ✅ "Serie 3 de 3 · sugerido 20 kg × 10" | |
| | Progreso del entrenamiento en la cabecera | ✅ "Ejercicio 1 de 3 · 0:07 transcurrido" y barra por ejercicio | |
| A3 Mi progreso | Cuatro indicadores de cabecera | ⚠️ Tres por ejercicio (sesiones, volumen, mejor del rango); la racha va en su propia tarjeta | `al-02-progreso` |
| | Progresión de cargas comparada (tres levantamientos superpuestos) | ⚠️ Un ejercicio por vez, con selector y cuatro métricas (1RM estimado, peso máximo, volumen, reps) | |
| | Detalle por ejercicio | ✅ | |
| | Peso corporal y medidas | ✅ En Mi perfil | `al-06-perfil` |
| | Logros obtenidos | ✅ "Tus logros", con la racha y los desafíos | |
| A4 Asistente IA | Consultas, contexto de sesión, respuestas y atajos | ➖ Depende de n8n, que lo hace Igna más adelante (tarjeta 13) | |
| A5 Mi perfil | Datos personales editables | ➖ Se ven, no se editan: "Para cambiar tus datos, hablá con tu entrenador" (decisión de la tarjeta del portal) | `al-06-perfil` |
| | Medidas con su variación y registrar una nueva | ✅ "Registrar medición", evolución del peso e historial | |
| | Su entrenadora a la vista con acceso al mensaje | ⚠️ El chat con el PT está en Mensajes, no en el perfil | `al-05-mensajes` |
| | Configuración de la cuenta (contraseña, notificaciones, sin conexión, exportar) | ➖ | |

**Entrenador**

| Pantalla | Funcionalidad de la guía | Resultado | Captura |
|---|---|---|---|
| E1 Dashboard | Indicadores de cartera | ⚠️ Activos, inactivos de más de 7 días y nunca entrenaron; sin sesiones de la semana ni adherencia | `pt-01-dashboard` |
| | Gráfico de actividad | ➖ | |
| | Alertas de inactividad | ✅ (B3) | |
| | Actividad reciente | ➖ | |
| E2 Panel de alumnos | Grilla de tarjetas | ✅ Nombre, objetivo, última sesión, racha y "Nuevo" | `pt-02-alumnos` |
| | Adherencia por alumno | ➖ | |
| | Filtros y ordenamiento | ✅ Objetivo, estado y orden, más búsqueda | |
| | Alumnos en riesgo señalados | ✅ Estado en la tarjeta y en la ficha ("Al día") | |
| | Alta desde el mismo lugar | ✅ "Nuevo alumno" arriba y "Generar QR" fijo en el sidebar | |
| E3 Perfil del alumno | Antropometría con evolución | ✅ Siete medidas, evolución del peso e historial | `pt-03-ficha-alumno`, `pt-12-ficha-1280` |
| | Evolución de cargas clave | ✅ El mismo panel de progreso que ve el alumno (B4) | |
| | Indicadores de compromiso | ⚠️ Racha y logros; sin sesiones sobre planificadas ni esfuerzo promedio | |
| | Historial con notas | ✅ Sesiones con detalle, RPE y comentario del PT | |
| | Acciones sobre el alumno | ✅ Mensaje, Asignar rutina, Editar y Dar de baja | |
| E4 Crear rutina | Tabla editable por ejercicio | ✅ | `pt-05-editor-rutina`, `pt-11-editor-1280` |
| | Biblioteca lateral filtrable | ✅ Grupo muscular, equipamiento y búsqueda | |
| | Partir de una plantilla | ✅ "Usar plantilla" y "Guardar como plantilla" | |
| | Metadatos de la rutina | ⚠️ Nombre, objetivo y días; sin duración estimada ni nivel | |
| | Guardado automático, asignar aparte | ✅ Borrador en el navegador y "Asignar a alumno" | |
| E5 Generar QR | Datos que el PT ya conoce | ✅ Nombre, email, teléfono, objetivo y nivel (B1) | `pt-06-nuevo-alumno` |
| | Plantilla inicial opcional | ➖ La rutina se asigna después, desde la ficha | |
| | Código generado al instante | ✅ QR y link de respaldo (F1) | |
| | Envío por mensajería | ✅ WhatsApp | |
| | Qué ve el alumno | ✅ Los cuatro pasos | |
| E6 Agenda | Vista semanal por franja | ✅ 7 días × 08 a 20 h, hoy destacado | `pt-09-agenda`, `pt-13-agenda-1280` |
| | Turnos identificados por alumno | ✅ Por estado (pendiente, confirmado, cancelado) | |
| | Alta manual de turnos | ✅ "Nuevo turno" (B7) | |
| | Origen en la disponibilidad | ✅ "Disponibilidad" | |

Pantallas que la web tiene y la guía no numera, recorridas igual: Mis rutinas e Historial del alumno (`al-03`, `al-04`), y Rutinas, Biblioteca, Desafíos y Mensajes del PT (`pt-04`, `pt-07`, `pt-08`, `pt-10`, `pt-14`).

## 4. Bugs y observaciones

Severidad: **crítico** (pérdida de datos, flujo crítico que no se puede terminar, datos ajenos o mal mostrados) · **menor**.

| # | Pantalla | Pasos | Obtenido | Esperado | Severidad | Estado |
|---|---|---|---|---|---|---|
| B1 | Nuevo alumno | Invitar a alguien sin teléfono, para compartirle solo el QR. | El teléfono es obligatorio: la web siempre invita por los dos canales (`delivery_channel: 'both'`). | Es una decisión de diseño de la tarjeta de invitaciones; el contrato permite QR sin teléfono. | Menor (observación) | Documentado |
| B2 | Link de invitación | Con una sesión abierta (por ejemplo el PT probando su propio link), abrir `/join?token=…`. | Redirige al inicio de esa sesión y el token se pierde. | Mostrar el alta igual, o avisar "Cerrá sesión para aceptar la invitación". | Menor | Arreglado (`fe0b3f9`) |
| B3 | Dashboard del PT | Tener un alumno que nunca entrenó y ninguno inactivo. | Las alertas dicen "Todos tus alumnos entrenaron en la última semana" al lado de "NUNCA ENTRENARON: 1". | Un texto fiel a lo que se mide (inactivos de más de 7 días). | Menor | Arreglado (`ce22069`) |
| B4 | Ficha del alumno (PT) | Abrir la ficha de un alumno con menos de 3 entrenamientos. | Los avisos de progreso le hablan al PT como si fuera el alumno: "Llevás 1 de 3…, vas a ver **tu** progresión acá". | Un texto neutro, que sirva para los dos. | Menor | Arreglado (`ce22069`, `50f9614`) |
| B5 | Detalle de sesión | Abrir el detalle de una sesión con 22,5 kg. | "22.5 kg", con punto; el resto de la web usa coma ("47,5 kg"). | "22,5 kg". | Menor | Arreglado (`ce22069`) |
| B6 | Cualquier pantalla del alumno o del PT | Apagar el backend y recargar. | Manda al login, aunque la sesión sigue guardada (a propósito: `restore()` pasa a `anonymous` sin red, `useAuthStore.js`). No se pierde nada: con la red de vuelta, recargar restaura todo, incluida la sesión de entrenamiento. | Un estado "Sin conexión, reintentando" en vez del login. | Menor | Arreglado (GX9 c, `feature/web-details-gx9`) |
| B7 | Formularios y confirmaciones (ejercicio, nuevo turno, cargar y borrar medida, borrar desafío, guardar como plantilla) | Doble click rápido en el botón de guardar o confirmar. | Dos requests: el guard mira `isPending`, que llega recién en el render siguiente. Lo destapó la estabilización de los tests (sección 6). | Un solo request. | Menor | Arreglado (`119b0db`, `77f668f`) |

Descartado: con la red lenta, un script que llamaba dos veces a `click()` en el mismo tick duplicaba el mensaje del chat. Con un doble click real (eventos de mouse separados) y con dos Enter seguidos sale uno solo, porque React aplica el `setText('')` del primero antes del segundo; un test con dos `fireEvent.click` lo confirma. No es un caso al que llegue una persona.

## 5. Arreglos

Cada arreglo con su test primero (falla sin el cambio) y verificado después en el navegador.

| Bug | Cambio | Test | Verificado |
|---|---|---|---|
| B2 | `/join` sale de `GuestOnly`. Con una sesión abierta, la página dice "Tenés una sesión abierta como Martina QA" y ofrece **Cerrar sesión y aceptar la invitación** (se queda en el link y muestra el formulario) o **Volver a mi cuenta**. Al crear la cuenta desde el formulario navega al inicio del rol, como antes. | `JoinPage.test.jsx`: los dos casos con sesión abierta; el de crear la cuenta sigue pasando. | Link nuevo de Martina abierto con su sesión: aviso → cerrar → formulario con "Tomás QA". |
| B3 | Estado vacío de las alertas: "Nadie lleva más de 7 días sin entrenar". | `DashboardPage.test.jsx`: con un alumno recién creado que nunca entrenó, no aparece "Todos tus alumnos entrenaron". | Dashboard de Martina, Pedro nunca entrenó (`pt-01-dashboard`). |
| B4 | "Hay 1 de 3 entrenamientos de…: después del tercero aparece la progresión acá", y lo mismo con las semanas del volumen semanal: sin "Llevás" ni "tu". | `ExerciseCurveCard.test.jsx`, `WeeklyVolumeCard.test.jsx` y `ProgressPanel/panel.test.jsx` (texto completo). | Mi progreso de Lucía (`al-02-progreso`). |
| B5 | El detalle de sesión formatea los kilos con `kgText` (es-AR), el real y el del plan. | `SessionDetail.test.jsx`: 27.5 → "27,5 kg", plan "/ 22,5 kg", ningún "x.y kg". | Detalle de la sesión de Lucía: "22,5 kg". |
| B6 | Estado `offline` en `useAuthStore`: sin respuesta del refresh (red caída, 429 o cualquier 5xx), al cargar o a mitad de uso, la sesión queda guardada y los guards (y `/join`) muestran "Sin conexión con el servidor" con "Reintentar ahora" y "Cerrar sesión". `useSessionRetry` reintenta a los 2, 4, 8 y 16 s, después cada 30 s, y al instante con el evento `online`; `retry()` no pasa por `loading`. Solo un rechazo (400/401/403) borra la sesión y manda al login. Ni la caché ni el entrenamiento en curso se tocan. | `useAuthStore/offline.test.js`, `useSessionRetry.test.jsx`, `SessionOffline.test.jsx`, `guards.test.jsx` y `JoinPage.test.jsx`; `login` y `rate-limit` esperan `offline` donde antes esperaban `anonymous`. | Pendiente en el navegador (capturas `04` y `05` de `assets/gx9/`). |
| B7 | Hook `useSubmitLock` (`src/hooks/shared/`): un ref sincrónico que deja pasar una sola corrida a la vez, en los seis diálogos. `AssignRoutineDialog` ya tenía el suyo. | Un test "un doble click en … manda un solo …" por diálogo, con `userEvent` sin pausa. Antes del arreglo fallaban cuatro: el de nuevo turno ya tenía un test de doble click, pero con la pausa de `userEvent` no detectaba nada, y guardar como plantilla se salvaba de casualidad por un render de la validación. Más 5 tests del hook. | Tests (la carrera depende de microsegundos). |

**Para el futuro (no se hace en esta tarjeta):**
- **Lo que la Guía Web muestra y la web no tiene** (➖ y ⚠️ de la sección 3): gráfico y actividad reciente del dashboard, adherencia, configuración de la cuenta del alumno, plantilla inicial en la invitación, duración y nivel de la rutina, y el asistente IA (tarjeta 13). Para decidir en el tablero qué entra antes de la entrega.
- **Caso para Igna (celular):** los cuatro flujos con un celular físico, sobre todo el modo avión real con la app en segundo plano.

## 6. Tests automáticos de la web

Criterio de la spec: un test es inestable si falla alguna vez en 3 corridas con la configuración de CI (`--maxWorkers=2 --testTimeout=15000`) más 1 con la de fábrica. Además se forzó con estrés: toda la suite con `--maxWorkers=100%` y orden al azar (`--sequence.shuffle`), y las carpetas sospechosas 10 veces seguidas.

**Línea base (antes de tocar nada):** las 4 corridas del criterio en verde. El estrés sí rompía:

| Corrida | Fallos |
|---|---|
| Suite entera con shuffle (2 corridas) | `useActiveWorkout/upload`, `ProgressPanel/panel` (2 tests), `StudentsPage/list`, `RoutineEditorPage/assign` |
| Editor de rutinas, biblioteca, invitar alumno y mensajes, 10 veces | `RoutineEditorPage/assign` en 9 de 10 y `save-template` en 5 de 10 (se pasaban de los 5 s) |

**Causas y arreglos** (sin subir timeouts ni agregar esperas):

| Tests | Causa | Arreglo |
|---|---|---|
| `useActiveWorkout/upload` | Las series se suben ordenadas por `executedAt` y, si empatan, por id (un UUID al azar). El test registraba dos series en el mismo milisegundo. | Reloj falso y la segunda serie 90 s después (`6fe2a34`). |
| `RoutineEditorPage/assign` y `save-template` | `userEvent` con `delay: 0` espera un `setTimeout(0)` en cada paso, que en Windows son ~15,6 ms: un clic costaba ~100 ms y armar una rutina pasaba los 5 s con la suite en paralelo. | `tests/helpers/shared/user.js`, `userEvent` sin pausa, en el editor, la biblioteca, invitar alumno y mensajes: el test largo baja de 2,2 s a 0,86 s (`39178b8`). |
| `ProgressPanel/panel`, `StudentsPage/list` | El primer render en un worker nuevo tarda ~3 veces más (JIT en frío) y lo pagaba el primer test del archivo, que con shuffle podía ser cualquiera. | `tests/helpers/shared/warmUp.js` monta la pantalla una vez en `beforeAll`; sale el `timeout: 4000` que lo tapaba (`39178b8`). |

Sacar la pausa de `userEvent` destapó un bug real: **un doble click en Guardar del formulario de ejercicio mandaba dos POST**, porque el guard miraba `isPending`, que llega recién en el render siguiente. Se arregló con un ref sincrónico (`119b0db`), y después en los otros cinco diálogos que tenían el mismo guard (B7).

**Después:** las carpetas sospechosas 10 de 10 en verde (114 tests cada vez); la suite con shuffle 3 de 3 (1850/1850); la configuración de CI 3 de 3 y `npm test` en verde; lint limpio.

`reorder.test` queda con el `userEvent` de fábrica: el teclado de dnd-kit necesita la pausa entre teclas.
