---
tags: [spec]
tarjeta: 13
---
# Spec — Gráficos de progreso en mobile

- **Tarjeta:** [tablero de equipo](https://trello.com/c/lwRucZYN) (13 del tablero personal de Igna, ⚪ P2, ~10 h).
- **Fecha:** 2026-10-31
- **Rama:** `feature/android-graficos`, sale de `feature/android-historial` (tarjeta 12, PR #40 sin mergear), porque ahí vive la pestaña Progreso. Cuando la #40 entre a `develop`, esta rama se rebasa o se mergea `develop` y la PR apunta a `develop`. Solo mobile: el backend no se toca.
- **Reglas que aplican:** `AGENTS.md` (Room es la única fuente de verdad; la UI nunca llama a Retrofit) y `CONTRIBUTING.md` (200 líneas, capa → módulo → archivo).
- **Contrato:** `docs/superpowers/specs/2026-10-29-progress-backend-design.md` §3.1 y §3.2: `GET /progress/exercise/:exerciseId` y `GET /progress/body/:studentId`. Ya están en `develop` (PR #31).
- **Diseño:** Guía Mobile p.16 (06 Progreso) como referencia; se toma solo la vista por ejercicio y la de medidas. Sistema de la app: tema oscuro, azul `#2952D9`, Space Grotesk / Inter / JetBrains Mono, toque mínimo 44 px.

## 1. Objetivo

Que el alumno vea desde el celular cómo progresan sus cargas y su cuerpo.

**Criterio de aceptación (tarjeta):** el alumno abre su progreso, elige un ejercicio y ve la curva de carga de los últimos meses.

**Agregado en el debate:** también ve la evolución de sus medidas (peso, cintura, etc.) y puede cambiar el período.

## 2. Decisiones tomadas (debate del 31/10)

- **Dónde:** la pestaña Progreso pasa a tener dos solapas, **Historial** (la de la tarjeta 12, sin cambios) y **Gráficos**. Ya estaba previsto en la spec de la 12, §2.
- **Layout A** (elegido entre tres mockups): dentro de Gráficos, un selector segmentado **Cargas | Medidas**; cada vista tiene su selector de qué graficar, un gráfico grande y dos números debajo.
- **Medidas entra; volumen semanal no.** El volumen semanal no tiene endpoint. Tampoco se ofrece el volumen por ejercicio como métrica, para no confundirlo.
- **El período lo cambia el alumno:** chips **1M · 3M · 6M · Todo**, por defecto **3M**.
- **Solo el alumno.** El entrenador no ve estos gráficos en el celular; los tiene en la web (PR #34).

## 3. Pantallas

### 3.1 Progreso con solapas

- Encabezado "Progreso" con el resumen de la semana (el de la 12) y debajo dos solapas: Historial | Gráficos.
- Abre en **Historial**, como hoy. El badge de comentarios no leídos sigue sobre la pestaña de la barra inferior.
- La solapa elegida sobrevive a la rotación y a volver desde el detalle de una sesión.

### 3.2 Gráficos → Cargas

De arriba hacia abajo:
1. **Desplegable de ejercicio.** Lista los ejercicios que aparecen en el historial guardado en el celular (§4.1), ordenados por la última vez que se entrenaron, el más reciente primero. Viene elegido el primero.
2. **Chips de métrica** (decisión de Claude: se muestra solo el chip de una métrica con algún valor > 0 en todo el historial):
   - **1RM est.** si algún punto tiene `e1rm_kg`. No lo tienen los ejercicios hechos siempre a más de 12 repeticiones, porque el backend no estima el 1RM ahí.
   - **Kg máx** si algún punto tiene `max_kg`.
   - **Reps totales** (suma de repeticiones del día) solo si no hay ninguno de los dos, es decir, peso corporal.
   - La métrica elegida de entrada es `default_metric` del backend (`e1rm_kg`, `max_kg` o `reps`), que sigue la misma escalera.
   - Un día sin valor para la métrica elegida se saltea: la línea une los días que sí tienen.
3. **Chips de período:** 1M · 3M · 6M · Todo.
4. **Gráfico de línea:** un punto por día entrenado dentro del período, eje X con fechas, eje Y con la métrica. El punto del récord (de la métrica elegida) va marcado en dorado con 🏆.
5. **Dos números:**
   - **Récord 🏆:** `pr` del backend para la métrica elegida (de todo el historial, no del período), con su fecha. Para Reps totales: el día con más repeticiones sumadas y su fecha, calculado en el celular. No es la mejor serie: eso pediría un dato que el endpoint no manda.
   - **En el período:** último valor menos primer valor dentro del período elegido, con signo (`+17,5 kg`, `+4 reps`). En verde si sube; gris si baja o queda igual.

### 3.3 Gráficos → Medidas

1. **Chips de campo:** solo los campos que tienen al menos un valor cargado, en este orden: Peso, % grasa, Cadera, Pecho, IMC. Altura y cintura no se grafican (cintura: decisión de Igna en la revisión del 31/10). Viene elegido el primero disponible.
2. **Chips de período:** los mismos, con el mismo valor por defecto. El período es uno solo para Cargas y Medidas: cambiarlo en una vista lo cambia en la otra.
3. **Gráfico de línea** del campo, un punto por medición.
4. **Dos números:** **Última** (valor y fecha) y **En el período** (último menos primero dentro del período). Para las medidas el color no es "bueno/malo": siempre gris, porque bajar de peso puede ser bueno o malo según el objetivo.

### 3.4 Estados

| Situación | Qué ve |
|---|---|
| No hay ejercicios en el historial guardado | "Terminá tu primera sesión para ver tus gráficos" |
| El ejercicio tiene un solo punto en total | El punto con su valor y "Entrená otra vez este ejercicio para ver tu curva" |
| El período no tiene puntos, pero hay en otros | "No entrenaste este ejercicio en este período" con botón "Ver todo" |
| No hay medidas cargadas | "Tu entrenador todavía no cargó medidas" |
| Sin red y con datos guardados | Lo guardado + "Sin conexión · mostrando lo guardado" (mismo aviso que el Historial) |
| Sin red y nunca se bajó ese ejercicio | "Conectate una vez para ver este gráfico" |
| Falla el refresco (5xx, timeout) | Lo guardado + "No pudimos actualizar" con Reintentar |
| 404 `EXERCISE_NOT_FOUND` (el entrenador lo borró) | El ejercicio sale del desplegable y se elige el siguiente |

## 4. Datos

### 4.1 De dónde sale la lista de ejercicios

No hay endpoint de "ejercicios que entrené". La lista sale de Room, del historial de la tarjeta 12: los `history_exercises` de las sesiones guardadas **con detalle**. En la práctica son las últimas 20 (cuyo detalle se baja en segundo plano) más las de "Ver más" que el alumno haya abierto; las de "Ver más" sin abrir no tienen ejercicios en Room y no aportan.

**Hace falta guardar el id del ejercicio:** `history_exercises` guarda solo el nombre, pero el DTO (`HistoryExerciseDto.exercise: NamedRefDto`) ya trae el `id`. Se agrega la columna `exerciseId: String?` (nullable para que la migración sea automática: **Room v9, `AutoMigration(8 → 9)`**). Las filas con `null` no aparecen en el desplegable. Si hay ejercicio sustituido, el que cuenta es el ejecutado (`exercise`), no `original_exercise`.

**Relleno después de actualizar la app** (decisión de Claude): hoy `HistoryRepository` solo vuelve a bajar el detalle de una sesión si cambió (`detailMatches`), así que las filas migradas quedarían en `null` para siempre. Se amplía esa condición: una sesión cuyo detalle tiene algún ejercicio con `exerciseId = null` también se considera desactualizada. El primer refresco con red después de actualizar vuelve a bajar esos detalles (como mucho 20) y desde ahí no se repite. Test en el repositorio.

Consecuencia aceptada: un ejercicio que no aparece en ninguna sesión guardada con detalle no se puede elegir.

### 4.2 Caché de los gráficos (Room, misma v9)

- `progress_exercise_points`: `exerciseId`, `date`, `maxKg?`, `e1rmKg?`, `reps`, `sets`. Clave (`exerciseId`, `date`).
- `progress_exercise_meta`: `exerciseId` (PK), `defaultMetric`, `prMaxKg?`, `prMaxKgDate?`, `prE1rmKg?`, `prE1rmDate?`, `fetchedAt`.
- `progress_body_points`: `measuredAt`/fecha (o el `id` de la medición si lo trae) + los seis campos y `bmi`, nullables.

Cada refresco **reemplaza** todo lo de ese ejercicio (o todas las medidas) en una transacción. Las tablas se borran con el resto de los datos al cerrar sesión o cambiar de cuenta, como las del historial.

### 4.3 Cómo se baja

- Siempre el **historial completo**: `GET /progress/exercise/:id` sin `from`/`to`, y `GET /progress/body/:studentId` con el id del usuario logueado. El período se filtra en el celular, así cambiar de chip es instantáneo y funciona sin red.
- **Cuándo:** al elegir un ejercicio (o abrir Cargas con uno elegido) y al abrir Medidas, si hay red y lo guardado tiene más de 5 minutos. Reintentar fuerza el refresco.
- La UI lee de Room con `Flow`; el repositorio refresca Room. El ViewModel no ve Retrofit.

## 5. Componentes (orientativo)

- `data/api/progress/ProgressApi.kt` + `ProgressDtos.kt`.
- `data/db/progress/` entidades + `ProgressDao`.
- `data/progress/ProgressRepository.kt` + mappers + modelos (`ExerciseChart`, `BodyChart`, `ChartRange`, `ChartMetric`).
- `di/ProgressModule.kt`.
- `ui/progress/` (o dentro de la pantalla de Progreso de la 12): `ProgressTabs`, `ChartsScreen` con `ExerciseChartsSection` y `BodyChartsSection`, `ChartsViewModel`, `LineChart` (envoltorio de la librería) y textos.
- Lógica pura y testeable fuera de los composables: filtro por período, delta, récord de Reps, elección de métrica por defecto y lista de campos con datos.

**Librería de gráficos:** Vico (`com.patrykandpatrick.vico:compose-m3`), la estándar para Compose. Elección de Claude para no dibujar ejes y escalas a mano. Si la versión estable no compila con el BOM del proyecto, el plan puede cambiar a un `Canvas` propio y simple; anotarlo en el plan.

## 6. Pruebas

**Unitarias (`testDebugUnitTest`):**
- Filtro por período (bordes: hoy, exactamente 30/90/180 días, "Todo").
- Delta del período con 0, 1 y varios puntos.
- Métrica por defecto y caso peso corporal (solo Reps).
- Campos de medidas con datos y orden.
- Repositorio: reemplazo transaccional, regla de los 5 minutos, 404 saca el ejercicio, error 5xx no borra lo guardado.
- Migración 8 → 9 en `FitTrainerDatabaseMigrationTest`.

**A mano (emulador, con `alumna.card8`):**
1. Con sesiones terminadas, Progreso → Gráficos → Cargas muestra la curva del último ejercicio; cambiar ejercicio, métrica y período.
2. Cargar medidas desde la web del entrenador → Medidas muestra la curva de peso.
3. Modo avión → los gráficos ya vistos siguen; uno nunca abierto muestra "Conectate una vez".
4. Rotar la pantalla y volver del detalle de una sesión sin perder solapa, ejercicio ni período.

## 7. Fuera de alcance

- Volumen semanal y volumen por ejercicio.
- Logros, rachas y desafíos (tarjeta 15).
- Comparar levantamientos entre sí (mockup p.16).
- Gráficos del entrenador en el celular.
- Elegir ejercicios que no estén en el historial guardado.
- Tocar un punto para ver el detalle de esa sesión.
