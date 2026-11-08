# GW4 · Progresión de cargas comparada (A3, y E3) — diseño

Ticket 4 de 5 de "lo que falta de la Guía Web". Una PR. Rama sugerida: `feature/progress-compare`.

## Contexto

Guía Web (`src/guia-web-hifi.jsx`):

- **A3 · Mi progreso**, funcionalidad 2, "Progresión de cargas comparada": "Los tres levantamientos principales superpuestos en un mismo gráfico, algo que en el teléfono obliga a alternar."
- **E3 · Perfil del alumno**, funcionalidad 2, "Evolución de cargas clave": "Tres levantamientos principales superpuestos en un gráfico de doce semanas."

Referencia visual: `AW_Progreso` en `src/alumno-web-2.jsx`, tarjeta "Progresión de cargas" (tres líneas: accent, `cool` y `hot`, leyenda arriba a la derecha con un trazo corto y el nombre).

Hoy la web dibuja **un** ejercicio por vez (`ExerciseCurveCard` dentro de `ProgressPanel`, con selector de ejercicio, rango y métrica).

## Decisiones

| # | Decisión |
|---|---|
| 1 | Un ticket por pantalla: 5 tickets = 5 PRs. Esta es la del gráfico comparado. |
| 2 | **Un gráfico de líneas multi-serie** con los **3 ejercicios más entrenados en el rango elegido**, cada uno con **al menos 3 puntos** (`MIN_POINTS`). |
| 3 | Cada línea se puede **cambiar** con un selector propio (3 selects, uno por color). |
| 4 | Se reusan recharts, `chartStyle.jsx` (`AXIS`, `GRID`, `TooltipBox`) y el eje de tiempo real de `ExerciseCurveCard` (`dateToTime`, `formatShortDate`). |
| 5 | **Fuera de `ProgressPanel`**: componente propio, montado a nivel página. |
| 6 | **Métrica**: 1RM estimado (`e1rm_kg`), que hace comparables series con distintas repeticiones (ADR 0004); si un ejercicio no tiene ningún `e1rm_kg`, su `max_kg`. Los de peso corporal (`hasKg` falso) no entran: no se comparan kg con repeticiones. |
| 7 | **Rango propio** (select con `RANGES`: 1 mes, 3 meses, todo; por defecto 3 meses ≈ las 12 semanas de E3). No se comparte con el de `ProgressPanel` porque ese estado vive adentro del panel, que no se toca. Con el mismo rango, las curvas comparten caché con el panel (misma query key). |
| 8 | **"Más entrenados en el rango"**: candidatos = ejercicios de `overview.exercises` con `days ≥ 3`, ordenados por `days` (hasta 6); se piden sus curvas del rango, se descartan los que no tienen kg (eso solo se sabe con la curva) y se eligen los 3 con más puntos válidos (≥ 3), desempate por `days` y nombre. Así no se pide la curva de todo el catálogo. |
| 9 | **También en la ficha del PT**: sí. `StudentProfilePage.jsx` no está en ninguna PR abierta y la sección "Progreso" ya existe; la tarjeta va arriba de `ProgressPanel`, sin tocar `ProfileActions.jsx` ni el panel. |

## Diseño

`CompareCard` (`Card` "Progresión comparada", `extra` = select de rango compacto):

- Fila de 3 selects (`Select` existente), cada uno con un punto del color de su línea y el label "Ejercicio 1/2/3". Opciones: todos los de `overview.exercises` con `days ≥ 3` (los de peso corporal ya detectados, deshabilitados con "sin peso registrado"), sin los ya elegidos en los otros dos. Elegir uno que no estaba pedido dispara su curva.
- Gráfico (`CompareChart`, `h-64`, `role="img"`, `aria-label="Progresión comparada de Press banca, Sentadilla y Peso muerto"`): `LineChart` con eje X de tiempo (`time`, `scale="time"`), eje Y en kg, una `Line` por ejercicio (`connectNulls`, puntos de 3,5 px, sin resaltar récords). Colores: `--color-accent`, `--color-cool`, `--color-hot`.
- Tooltip: la fecha larga y una fila por ejercicio con valor ese día ("Press banca: 88,7 kg").
- Debajo, una línea mono: "1RM ESTIMADO · KG" (o "PESO MÁXIMO · KG" si todos los elegidos caen en `max_kg`; si se mezclan, cada select aclara "(peso máx.)").

**Estados**
- El overview no tiene ningún candidato (`days ≥ 3`), o todos resultan de peso corporal: **no se muestra la tarjeta** (el vacío ya lo explica `ProgressPanel`; así no hay dos textos de vacío).
- Cargando curvas: `LoadingState rows={2}` "Cargando la progresión…".
- Hay candidatos pero ninguno llega a 3 puntos en el rango: texto "En este rango ningún ejercicio tiene 3 entrenamientos. Probá con un rango más largo." y el select de rango.
- Solo 1 o 2 llegan: se dibujan esos y los selects que sobran quedan en "Elegí un ejercicio".
- Error en alguna curva: esa línea no se dibuja y aparece "No pudimos cargar Sentadilla." con Reintentar (`refetch` de esa curva); si fallan todas, `ErrorState` "No pudimos cargar la progresión." en la tarjeta.

**Ubicación**: `MyProgressPage` entre los KPIs (GW3) y `ProgressPanel`; ficha del PT, sección "Progreso", arriba de `ProgressPanel`. Ancho completo en las dos.

## Datos

- `GET /progress/overview?student_id&from&to` → `exercises` (`days` es de todo el historial, sin filtrar por rango).
- `GET /progress/exercise/:id?student_id&from&to` → `points` (`date`, `e1rm_kg`, `max_kg`), uno por candidato, en paralelo (`useQueries`).
- Misma query key que `useExerciseProgress`: se extrae `exerciseProgressOptions(id, studentId, range)` en `useProgress.js` y la usan los dos.
- Sin cambios de backend ni de contrato.

## Archivos que toca

- Crea `frontend/src/utils/progress/compare.js`: `compareCandidates(exercises, max = 6)`, `pickTop(curves, n = 3)`, `compareMetric(points)`, `mergeSeries(curves, metric)` → filas `{ time, [id]: valor }`.
- Crea `frontend/src/hooks/progress/useCompareCurves.js` (`useQueries` + selección y reemplazo de las 3 líneas).
- Modifica `frontend/src/hooks/progress/useProgress.js` (33 líneas: exporta `exerciseProgressOptions`; `useExerciseProgress` la usa).
- Crea `frontend/src/components/progress/compare/CompareCard.jsx`, `CompareChart.jsx`, `CompareSlots.jsx`.
- Modifica `frontend/src/pages/progress/MyProgressPage.jsx` y `frontend/src/pages/students/StudentProfilePage.jsx` (+1 línea cada uno).
- Tests (crea): `frontend/tests/utils/progress/compare.test.js`, `frontend/tests/hooks/progress/useCompareCurves.test.jsx`, `frontend/tests/components/progress/compare/{CompareCard,CompareChart}.test.jsx`, `frontend/tests/pages/progress/MyProgressPage/compare.test.jsx`, `frontend/tests/pages/students/StudentProfilePage/activity/compare.test.jsx`. Se reusan `helpers/progress/progress.jsx` y `helpers/progress/recharts.js` sin cambios (si hace falta un tercer ejercicio en `EXERCISES`, se arma en el test).

**Chequeo contra PRs abiertas.** No toca `ProgressPanel.jsx` ni `NotEnoughData.jsx` (#81), ni `ExerciseCurveCard.jsx` (solo se reusan sus utilidades de formato, que están en `utils/progress/format.js`), ni el test `ExerciseCurveCard.test.jsx` (#81). Tampoco `ProfileActions.jsx`, `useAuthStore.js`, `students.routes.js`, `InactivityAlerts.jsx`, `RoutineEditorPage.jsx` ni `trainer-ai`/`chat`. Revisado contra los tests de la ficha y de "Mi progreso" en `develop`: el primer GET a `/progress/exercise` sigue siendo `ex-1` con el `student_id` (los candidatos se piden en orden de `days`, y `ex-1` tiene más), y el `aria-label` del gráfico nuevo no choca con "Progresión de Press banca". **Choque con GW3** (mismas dos páginas, líneas vecinas): mergear GW3 primero; si GW3 todavía no movió `MyProgressPage.test.jsx` a su carpeta, este ticket lo mueve.

## Pruebas

**Vitest**
- `compareCandidates`: excluye `days < 3`; ordena por `days`; corta en 6.
- `pickTop`: descarta peso corporal y los de menos de 3 puntos; los 3 con más puntos válidos en el rango; desempates.
- `compareMetric`: `e1rm_kg` si hay alguno, si no `max_kg`.
- `mergeSeries`: une por fecha con huecos en `null`.
- `CompareCard`: 3 líneas con sus nombres; cambiar el select 2 pide la curva nueva y reemplaza la línea; rango "1 mes" vuelve a elegir; ninguno con 3 puntos muestra el texto; sin candidatos no renderiza nada; error de una curva con su Reintentar.
- Páginas: la tarjeta aparece en "Mi progreso" y en la ficha, con el `student_id` correcto, y comparte caché con el panel (un solo GET por ejercicio y rango).

**Navegador:** alumno de QA con banca, sentadilla, peso muerto y una dominada (peso corporal); capturas en `docs/superpowers/specs/assets/gw4/` (`01-mi-progreso-comparada.jpg`, `02-cambiar-linea.jpg`, `03-rango-corto-sin-datos.jpg`, `04-ficha-pt.jpg`, `05-angosto-375.jpg`).

## Criterio de aceptación

- "Mi progreso" y la ficha del PT muestran un gráfico con hasta 3 ejercicios superpuestos, los más entrenados del rango, cada uno con 3 puntos o más.
- Cada línea se puede reemplazar por otro ejercicio.
- Los ejercicios de peso corporal no aparecen en la comparación.
- Lint y tests en verde; ningún archivo pasa de 200 líneas.

## Estimación

**7 h**: utils y hook 2 h, componentes 2 h, tests 2 h, navegador y capturas 1 h.

## Fuera de alcance

- "Detalle por ejercicio" con sparkline y % de mejora (otra funcionalidad de A3).
- Elegir la métrica del gráfico comparado (queda en 1RM estimado).
- Agregación semanal en el backend ("series agregadas por ejercicio y semana" de la nota técnica).
