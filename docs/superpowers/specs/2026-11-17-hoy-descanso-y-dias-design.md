# Hoy del alumno: día de descanso con progreso y moverse entre días (celular)

Fecha: 17/11/2026 · Dueño: Igna · Tarjeta: tablero MIS TAREAS, #76 · Rama `feature/android-hoy-descanso`.

## Por qué

En el celular, la pantalla **Hoy** de un día sin entrenamiento muestra la tira de la semana y una tarjeta de
"Día de descanso". Queda vacía y estática. Igna quiere que, cuando el alumno no entrena, vea **lo que entrenó y
lo que viene en la semana**, y que pueda **moverse entre los días** (ver lo que hizo el lunes o lo que tiene el
miércoles) para que la pantalla sea más interactiva. Igna eligió la opción **B, "Tu progreso mientras
descansás"**, entre tres maquetas. Se hace antes de la presentación del 18/11, a pedido de Igna.

## Objetivos

1. **Hoy en día de descanso** (`TodayContent.Rest`), de arriba abajo:
   1. **Tira de la semana** como hoy, con una marca ✓ en los días de esta semana que ya entrenó.
   2. **Racha:** "Racha de N días" con la aclaración "El descanso no la corta: está planificado". Sin racha
      (0 o gamificación nunca bajada) la tarjeta no se muestra.
   3. **Tres números:**
      - **Esta semana:** sesiones hechas sobre días asignados, por ejemplo "1/3".
      - **Este mes:** sesiones del mes calendario.
      - **Récords del mes:** sesiones del mes calendario con algún récord (`hasPr`), por ejemplo "2". Se
        muestra siempre, también con 0, así la fila siempre tiene tres celdas iguales. (Cambio de Igna, 17/11,
        después de probarlo en el celular: antes era "Desde el inicio", la diferencia de peso.)
   4. **Próximo logro:** la tarjeta que ya existe en Progreso (`NextAchievementCard`), con su barra.
   5. **Próximo entreno:** "MAÑANA · MIÉRCOLES" o el día que sea, el nombre de la rutina y la cantidad de
      ejercicios. Botón "Ver rutina", que abre el detalle de rutina que ya existe (`ROUTINE_DETAIL_ROUTE`).
2. **Moverse entre días:** los días de la tira se pueden tocar, en descanso y también en día de entreno.
   - **Hoy:** la pantalla de siempre.
   - **Día pasado de esta semana:**
     - Si entrenó, una tarjeta por sesión de ese día con rutina, duración, series, volumen, RPE y la marca
       de récord. Tocar la tarjeta abre el detalle de sesión que ya existe (`HISTORY_DETAIL_ROUTE`), con las
       series reales, la nota y el comentario del PT.
     - Si no entrenó: "No entrenaste este día" si era día asignado, o "Descanso" si no lo era.
   - **Día futuro de esta semana con rutina** (elegido por Igna el 17/11 tras probarlo en el celular): una
     tarjeta bajo "JUEVES 19 · TE TOCA" con el nombre de la rutina; el muñeco (`BodyMap`, frente y espalda) con
     un chip por grupo muscular "<grupo> · <n> series" (los dos primeros resaltados en ámbar); tres celdas
     iguales con ejercicios, series y minutos estimados (`~15 min`: por serie 45 s de trabajo + el descanso, 90 s
     si no tiene, redondeado a 5, mínimo 5); y "Ver rutina completa". Sin la lista de ejercicios y **sin botón
     para empezar**: solo se entrena el día de hoy.
   - **Día de descanso que no es hoy** (futuro sin rutina, o pasado sin sesión y sin rutina asignada; el
     pasado asignado sin sesión sigue en "No entrenaste este día"): tarjeta "Día de recuperación 😌" ("El
     músculo crece mientras descansás.") con tres consejos (🧘 10 minutos de estiramiento suave, 💧 Tomá al
     menos 2 litros de agua, 😴 Dormí 7–8 horas). Si es futuro y hay un entreno después, una segunda tarjeta
     "DESPUÉS · SÁBADO 21" con la rutina, la cantidad de ejercicios y "Ver rutina".
   - **Volver a hoy:** el día elegido se marca en la tira; tocar el día de hoy vuelve a la pantalla de siempre.
     (Sin botón "Volver a hoy": lo sacó Igna el 17/11 después de probarlo en el celular.)

## Fuera de alcance

- Moverse a otras semanas: solo la semana actual, de lunes a domingo.
- Cambios en el backend, en la web o en el esquema de Room. Todo sale de lo que ya está en Room, así que
  funciona sin conexión.
- Empezar una rutina de otro día desde Hoy. Eso sigue siendo de Mis rutinas.

## Lo que no puede pasar

- Que Hoy en día de entreno se vea o funcione distinto que ahora cuando el día elegido es hoy.
- Romper lo que ya hace Hoy:
  - la tarjeta de sesión abierta;
  - los avisos de subidas;
  - pull-to-refresh;
  - los músculos de hoy;
  - "Empezar".
- Números que contradigan Progreso. La racha y el próximo logro salen del mismo `GamificationSummary`
  que Progreso.

## Datos (todo de Room)

| Qué | De dónde |
|---|---|
| Rutinas y días | `RoutineRepository.observeCache`, la misma que hoy |
| Sesiones de la semana y del mes | `HistoryRepository.observe(ownerId)`: `HistoryItem` con `startedAt`, duración, series, volumen, RPE y `hasPr`. Incluye las sesiones del celular sin subir. |
| Racha y próximo logro | `GamificationRepository.observeSummary(ownerId)`. El próximo logro se elige con la misma regla que Progreso. |
| Récords del mes | Los mismos `HistoryItem` de arriba: sesiones del mes con `hasPr`, sin las `LOCAL_FAILED` |

El día de una sesión es la fecha de `startedAt` en la zona de negocio, `America/Argentina/Buenos_Aires`. Es la
misma zona que usan la racha (`LocalStreak.kt`, `BUSINESS_ZONE`) y Progreso, así que los ✓ y los números no
contradicen a Progreso cerca de la medianoche. El "hoy" de la semana, en cambio, es la fecha del dispositivo
(`screenToday`), la misma que usa el resto de Hoy (encabezado, rutina del día, "Empezar"), para que la tira no
marque un día y el hero muestre otro.

**Refresco:** Hoy sigue refrescando las rutinas como hasta ahora, con el mismo aviso si falla. Al abrir la
pantalla y con el pull-to-refresh también pide, en segundo plano y sin aviso propio, el historial, la
gamificación y las medidas. Así un alumno que nunca abrió Progreso igual ve sus datos. Si fallan, Hoy muestra lo
que haya en Room y **cada sección sin datos se oculta**:
- sin racha, no aparece la tarjeta de racha;
- sin logro pendiente, no aparece el próximo logro;
- de los tres números, se muestran los que tengan dato.

## Decisiones de Claude (revisables)

- **Detalle de un día pasado:** tarjetas resumen que abren el detalle de sesión existente, en lugar de
  repetir las series en Hoy. Así se reusa una pantalla probada y Hoy no crece.
- **Qué cuenta como sesión y como día:**
  - Cuentan las sesiones del historial, menos las `LOCAL_FAILED`, que el servidor rechazó.
  - **Esta semana N/M:**
    - N son los días distintos de lunes a domingo con al menos una sesión, sean asignados o no.
    - M son los días asignados de la semana, tomando la unión de todas las rutinas, igual que
      `Rest.trainingDays`.
    - Si N supera a M, se muestra igual (por ejemplo "4/3"): entrenó de más.
  - **Este mes:** sesiones del mes calendario que estén en Room. Room guarda las últimas 20 más las páginas
    que se bajaron con "Ver más", así que con más de 20 sesiones en un mes el número sale corto. Se acepta
    porque no pasa con un uso normal (4 o 5 por semana).
  - **"No entrenaste este día"** vale para un día pasado asignado y sin sesión. Un día pasado no asignado y
    sin sesión dice "Descanso".
- **"Ver rutina" abre el detalle de rutina tal cual está**, con su botón "Empezar". Mis rutinas ya permite
  entrenar una rutina que no es la del día. Lo que no se agrega es un "Empezar" dentro de Hoy para otro día.
- **Récords del mes:** cuenta las sesiones del mes calendario (zona argentina, la misma regla que "sesiones
  del mes") con `hasPr`, sin las `LOCAL_FAILED`. El texto dice "récords del mes". Reemplaza al peso "Desde el
  inicio" por pedido de Igna (17/11), después de probarlo en el celular.
- **Próximo logro:** la tarjeta abre Logros, igual que en Progreso.
- **Con otro día elegido, la sesión abierta se vuelve por la tarjeta "continuar".** Sin el hero a la vista, la
  tarjeta aparece siempre que haya una sesión abierta, sea o no de la rutina de hoy.
- **El día elegido vive en el ViewModel** (`selectedDate`) Se conserva al volver de un detalle (sesión o
  rutina) y vuelve a hoy solo si cambió la fecha. Para volver a mano se toca el día de hoy en la tira.
- **Lo calculado va en funciones puras con tests:** la semana con sus días hechos, los tres números y qué
  mostrar para un día. Igual que `resolveToday`.
- `TodayScreen.kt` ya tiene 194 líneas. Lo nuevo (modelo, ViewModel, items y componentes) va en
  `ui/today/week/`; `ui/today/components/WeekStrip.kt` se modifica, respetando el tope de 200 líneas por archivo.

## Criterio de aceptación

1. En un día de descanso, Hoy muestra la semana con ✓, la racha, los tres números, el próximo logro y el
   próximo entreno, y "Ver rutina" abre el detalle de la rutina.
2. Tocar un día pasado con sesión muestra su resumen, y tocar el resumen abre el detalle de la sesión.
3. Tocar un día futuro muestra su rutina sin botón para empezar.
4. Tocar el día de hoy en la tira vuelve a la pantalla de siempre. En día de entreno, con hoy elegido, nada cambia.
5. Sin conexión todo lo anterior funciona igual.
6. `gradlew checkFileLength assembleDebug testDebugUnitTest` en verde.
7. Probado en el S10 con la cuenta de Martín de la demo, o con la alumna de prueba.
