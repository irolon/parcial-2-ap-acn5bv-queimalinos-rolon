# Pruebas de la web

Tarjeta 53 (equipo, parte web) · MIS 25. Spec: `docs/superpowers/specs/2026-11-05-web-qa-design.md`. La app Android la prueba Igna en su parte de la misma tarjeta.

**Entorno (05/11):** backend y web locales (rama `test/web-qa` sobre `develop` 766ae0f) contra Supabase dev, en el navegador integrado de la app de escritorio, a 1366×768 y 1280×720. Cuentas de QA creadas para la prueba (`it.webmw3lthaf.*@test.fittrainer.dev`, se borran con `npm run test:integration:clean`): el PT Martina con Lucía (rutina de los 7 días y una sesión) y Pedro (sin rutina), y el PT Laura, registrada desde la web, con Sofía, dada de alta desde la web. Lo que en la realidad hace el celular se simuló por la API con los mismos requests que manda la app.

Resultado: ✅ pasa · ⚠️ pasa con observaciones · ❌ falla.

## 1. Flujos críticos

| # | Flujo | Web | Lado del celular (simulado por la API) | Resultado |
|---|---|---|---|---|
| F1 | Registro del PT → invitación → alta del alumno | Registro (validaciones de nombre, email y contraseña), dashboard vacío con "Generá tu primera invitación", invitación con QR y link de 48 h (copiar, WhatsApp, descargar), alta desde el link (contraseñas distintas → "Las contraseñas no coinciden"), el alumno entra a Hoy. El mismo link otra vez → "Esta invitación ya fue utilizada". | — | ✅ (B1, B2) |
| F2 | Armar rutina → asignarla → verla | Editor: biblioteca con filtros, 3 ejercicios, 7 días, peso "22,5" con coma; Asignar → Sofía; la ficha muestra "Rutina activa". | `GET /routines/mine` y `/routines/today` del alumno: los 3 ejercicios, 7 días, `suggested_kg` 22.5. | ✅ (B4) |
| F3 | Entrenar completo → sincronizar → verlo en la web | La alumna entrena desde la web: registra series, termina con RPE, ve el resumen ("3 series · 602,5 kg") y el logro. El PT ve la sesión en la ficha y en el detalle. | Sesión con UUID del cliente, lote de 9 series, cierre con RPE 8 y nota: aparece en la ficha del PT con racha 1 y el logro "Primera sesión". | ✅ (B5) |
| F4 | Entrenar sin conexión → reconectar → no se pierde nada | Backend apagado a mitad de la sesión: las series se siguen registrando; recargar no pierde nada; al terminar, "No pudimos guardar tu entrenamiento. Tus series siguen guardadas en este navegador" con Reintentar; con el backend de vuelta, Reintentar guarda **3 series, sin duplicados** (verificado por la API), y el botón no deja un doble envío. | Series con `executed_at` de 3 h antes y el **mismo lote mandado dos veces**: 9 creadas la primera vez, 0 la segunda. | ✅ (B6) |

## 2. Condiciones feas

| Condición | Qué se hizo | Resultado |
|---|---|---|
| Backend caído a mitad de la sesión | Ver F4. | ✅ |
| Recargar a mitad de la sesión | Con el backend arriba: vuelve al ejercicio, las series y el descanso en curso. Con el backend caído: B6. | ⚠️ |
| Sesión vencida | Backend local con `JWT_EXPIRES_IN=60s`, 70 s de espera y navegación: `401` → `POST /auth/refresh` 200 → reintento 200, sin que la alumna note nada. | ✅ |
| Dos pestañas | La misma sesión de entrenamiento abierta en dos pestañas: una serie registrada en la B aparece sola en la A; al terminar en la B ("2 series · 592,5 kg"), la A vuelve a Hoy con la sesión cerrada y la racha en 2. Una sola sesión guardada. | ✅ |
| Polling | `messages/unread-count` cada 15 s por pestaña y solo con la pestaña visible (`refetchIntervalInBackground: false`). | ✅ |
| Notebook chica | Las 6 pantallas del alumno y las 9 del PT a 1366×768 y 1280×720: ninguna con scroll horizontal (`scrollWidth` = `clientWidth`). La tabla de ejercicios del editor de rutinas scrollea adentro de su tarjeta, a propósito. | ✅ |
| Guards de rol | Alumna en `/pt/dashboard`, `/pt/alumnos`, `/pt/rutinas/nueva`, `/pt/agenda` → `/alumno/hoy`. PT en `/alumno/hoy`, `/alumno/entrenar`, `/alumno/perfil` → `/pt/dashboard`. | ✅ |
| Batería, giro de pantalla, app en segundo plano | Son del celular: no aplican a la web (Igna, tarjeta 53). | — |

## 3. Bugs y observaciones

Severidad: **crítico** (pérdida de datos, flujo crítico que no se puede terminar, datos ajenos o mal mostrados) · **menor**.

| # | Pantalla | Qué pasa | Esperado | Severidad | Estado |
|---|---|---|---|---|---|
| B1 | Nuevo alumno | El teléfono es obligatorio aunque se comparta solo el QR: la web siempre invita por los dos canales (`delivery_channel: 'both'`), así que no se puede invitar a alguien sin teléfono. | Decisión de diseño de la tarjeta de invitaciones; el contrato permite QR sin teléfono. | Observación | Documentado |
| B2 | Link de invitación | Con una sesión abierta (por ejemplo el PT probando su propio link), `/join?token=…` redirige al inicio de esa sesión y el token se pierde. | Mostrar el alta igual, o avisar "Cerrá sesión para aceptar la invitación". | Menor | Arreglado (`fe0b3f9`) |
| B3 | Dashboard del PT | Con un alumno que nunca entrenó, las alertas dicen "Todos tus alumnos entrenaron en la última semana" al lado de "NUNCA ENTRENARON: 1". | Un texto fiel a lo que se mide (inactivos de más de 7 días). | Menor | Arreglado (`ce22069`) |
| B4 | Ficha del alumno (PT) | Los avisos de progreso le hablan al PT como si fuera el alumno: "vas a ver **tu** progresión acá". | Un texto neutro, que sirva para los dos. | Menor | Arreglado (`ce22069`) |
| B5 | Detalle de sesión | Los kilos salen con punto ("22.5 kg") y el resto de la web usa coma ("47,5 kg"). | "22,5 kg". | Menor | Arreglado (`ce22069`) |
| B6 | Cualquier pantalla del alumno o del PT | Recargar con el backend caído manda al login, aunque la sesión sigue guardada (es a propósito: `restore()` pasa a `anonymous` sin red, `useAuthStore.js`). No se pierde nada: con la red de vuelta, recargar restaura todo, incluida la sesión de entrenamiento. | Un estado "Sin conexión, reintentando" en vez del login. | Menor | Documentado (más de 30 min: estado nuevo en los guards de ruta) |
| B7 | Formularios y confirmaciones (ejercicio, nuevo turno, cargar y borrar medida, borrar desafío, guardar como plantilla) | Un doble click rápido en el botón manda dos requests: el guard mira `isPending`, que llega recién en el render siguiente. Lo destapó la estabilización de los tests (sección 5). | Un solo request. | Menor | Arreglado (`119b0db`, `77f668f`) |

## 4. Arreglos

Cada arreglo con su test primero (falla sin el cambio) y verificado después en el navegador.

| Bug | Cambio | Test | Verificado |
|---|---|---|---|
| B2 | `/join` sale de `GuestOnly`. Con una sesión abierta, la página dice "Tenés una sesión abierta como Martina QA" y ofrece **Cerrar sesión y aceptar la invitación** (se queda en el link y muestra el formulario) o **Volver a mi cuenta**. Al crear la cuenta desde el formulario navega al inicio del rol, como antes. | `JoinPage.test.jsx`: los dos casos con sesión abierta; el de crear la cuenta sigue pasando. | Link nuevo de Martina abierto con su sesión: aviso → cerrar → formulario con "Tomás QA". |
| B3 | Estado vacío de las alertas: "Nadie lleva más de 7 días sin entrenar". | `DashboardPage.test.jsx`: con un alumno recién creado que nunca entrenó, no aparece "Todos tus alumnos entrenaron". | Dashboard de Martina (Pedro nunca entrenó). |
| B4 | "aparece la progresión acá" / "aparece el volumen semanal acá" en vez de "vas a ver tu…". | `ProgressPanel/panel.test.jsx`, `WeeklyVolumeCard.test.jsx` (texto completo). | Ficha de Lucía como PT. |
| B5 | El detalle de sesión formatea los kilos con `kgText` (es-AR), el real y el del plan. | `SessionDetail.test.jsx`: 27.5 → "27,5 kg", plan "/ 22,5 kg", ningún "x.y kg". | Detalle de la sesión de Lucía: "22,5 kg". |
| B7 | Hook `useSubmitLock` (`src/hooks/shared/`): un ref sincrónico que deja pasar una sola corrida a la vez, en los seis diálogos. `AssignRoutineDialog` ya tenía el suyo. | Un test "un doble click en … manda un solo …" por diálogo, con `userEvent` sin pausa: fallaban todos salvo guardar como plantilla, que se salvaba de casualidad por un render de la validación. Más 5 tests del hook. | Tests (la carrera depende de microsegundos). |

**Para el futuro (no se hace en esta tarjeta):**
- **B6:** un estado `offline` en `useAuthStore` que los guards de ruta muestren como "Sin conexión, reintentando" (con un reintento de `restore()` al volver la red) en vez de mandar al login.
- **Caso para Igna (celular):** los cuatro flujos con un celular físico, sobre todo el modo avión real con la app en segundo plano.

## 5. Tests automáticos de la web

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
