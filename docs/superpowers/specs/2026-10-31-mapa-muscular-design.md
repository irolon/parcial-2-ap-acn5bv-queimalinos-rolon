---
tags: [spec]
tarjeta: mapa-muscular
---
# Spec — Mapa muscular en la sesión activa y en Hoy

- **Tarjeta:** [Mapa muscular](https://trello.com/c/Q7m0cQCm) (tablero personal de Igna, lista S5). Idea de Igna; mockup aprobado el 31/10: https://claude.ai/artifact/T5Qnjtse1qrjfm4eiqYb3M (pantallas 1, 2a y 2b, ya con el dibujo real).
- **Fecha:** 2026-10-31
- **Rama:** `feature/android-mapa-muscular`, sale de `develop` (`1498b88`, ya trae la #40 y la #43). Solo mobile; el backend no se toca.
- **Reglas que aplican:** `AGENTS.md` (Room es la única fuente de verdad, tema oscuro, toque mínimo 44 px) y `CONTRIBUTING.md` (200 líneas por archivo de código, capa → módulo → archivo).

## 1. Objetivo

Que el alumno vea en un dibujo del cuerpo qué músculo está entrenando:

1. **Sesión activa:** el músculo del ejercicio actual, apenas empieza a entrenar.
2. **Hoy:** tocando la rutina del día, todos los músculos que se van a entrenar ese día.

El músculo se pinta de azul de marca (`#2952D9`) sobre un cuerpo gris (frente y espalda).

**Criterio de aceptación:**
- Al empezar una sesión, debajo del peso sugerido se ve el cuerpo con el músculo del ejercicio actual pintado. Al pasar al siguiente ejercicio (o reemplazarlo) cambia el músculo.
- En Hoy, tocando "Ver músculos de hoy" se abre una hoja inferior con los músculos de la rutina del día y, por grupo, sus ejercicios y series.
- Funciona sin conexión (todo sale de Room) y respeta el tema oscuro y el toque mínimo de 44 px.

## 2. Decisiones tomadas (31/10, con el mockup a la vista)

- **Sesión activa:** tarjeta **compacta** (cuerpo chico a la izquierda; a la derecha "TRABAJÁS", el nombre del grupo en azul y "equipo · N series"). Va **debajo del panel del peso sugerido** (`LoadPanel`) y arriba del botón "Serie completa → …".
- **Durante el descanso** (pantalla del timer) **no se muestra** el músculo.
- **Hoy:** en la tarjeta de la rutina (`RoutineHeroCard`), una fila nueva arriba de "Empezar": miniatura del cuerpo de frente + "Pecho · Hombros · Tríceps" + "Ver músculos de hoy ›". **Solo esa fila** abre la hoja (no la tarjeta entera, para no confundir con "Empezar").
- **Hoja inferior** (`ModalBottomSheet`, como las que ya hay): título "MÚSCULOS DE HOY" + nombre de la rutina; cuerpo grande de frente y espalda; debajo, una fila por grupo con sus ejercicios y la suma de series. Se cierra deslizando, con la ✕ o tocando afuera.
- **Dibujo:** los trazos de [`react-native-body-highlighter`](https://github.com/HichamELBSI/react-native-body-highlighter) v3.1.3 (licencia MIT, © 2022 ELABBASSI Hicham), cuerpo masculino de frente y espalda. **No** se usa nada de MuscleWiki: sus términos prohíben copiar sus imágenes.
- **Fuera de alcance:** la pantalla "Mi semana" (mapa de calor), músculos secundarios, cuerpo femenino, y tocar un músculo para ver ejercicios.

## 3. El dibujo (`assets`)

- Los trazos van como **datos**, no como código: `app/src/main/assets/body_map/body_map.json`, con dos vistas (`front`, `back`). Cada vista trae su `viewBox` y una lista de partes `{ "slug": "chest", "paths": ["M272.91 …", …] }`, más el contorno.
- Al lado, `LICENSE-react-native-body-highlighter.txt` con el aviso MIT completo, y un `README.md` corto que diga de dónde salen los datos (paquete y versión) y cómo se generaron.
- **Cómo se genera (decisión de Claude):** un script Node chico, `mobile/tools/body-map/generate-body-map.js` (menos de 200 líneas), que lee `assets/bodyFront.ts`, `assets/bodyBack.ts` y `components/SvgMaleWrapper.tsx` del paquete npm v3.1.3 (bajado aparte, no se agrega como dependencia) y escribe el JSON. Se commitea el script y el JSON; el paquete bajado no. En la prueba del mockup (31/10) ya se hizo esta extracción y se verificó:
  - las dos vistas traen todas las partes de la tabla del §4 (frente: `chest`, `obliques`, `abs`, `biceps`, `triceps`, `neck`, `trapezius`, `deltoids`, `adductors`, `quadriceps`, `knees`, `tibialis`, `calves`, `forearm`, `hands`, `ankles`, `feet`, `head`, `hair`; espalda: `neck`, `trapezius`, `deltoids`, `upper-back`, `triceps`, `lower-back`, `forearm`, `gluteal`, `adductors`, `hamstring`, `calves`, `ankles`, `feet`, `hands`, `head`, `hair`);
  - cada parte trae sus trazos en `left`, `right` y a veces `common` (se juntan todos);
  - el **contorno** de cada vista está en `SvgMaleWrapper.tsx` (dos `<Path d=…>`, el primero frente y el segundo espalda), dibujado solo con borde.
- El paquete dibuja las dos vistas en un mismo lienzo de 1448 × 1448: frente en x 0–724 y espalda en x 724–1448. Los trazos mezclan comandos absolutos y relativos, así que no se reescriben: cada vista del JSON trae su propio `viewBox` y el componente dibuja esa ventana. Recorte usado en el mockup, que se vio bien: frente `[30, 90, 670, 1280]`, espalda `[754, 90, 670, 1280]` (x, y, ancho, alto).

**Partes neutras** (siempre en gris neutro, nunca se pintan): `head`, `hair`, `hands`, `feet`, `ankles`, `knees`. El resto son músculos (gris de músculo o azul).

## 4. De grupo del backend a partes del dibujo

El backend tiene un solo `muscle_group` por ejercicio (`exercise.model.js`, `MUSCLE_GROUPS`):

| Grupo | Partes que se pintan |
|---|---|
| `chest` | `chest` |
| `back` | `upper-back`, `lower-back`, `trapezius` |
| `shoulders` | `deltoids` |
| `legs` | `quadriceps`, `hamstring`, `adductors` |
| `glutes` | `gluteal` |
| `biceps` | `biceps` |
| `triceps` | `triceps` |
| `core` | `abs`, `obliques` |
| `calves` | `calves` |
| `full_body` | todas las partes que no son neutras |
| `cardio` | ninguna |

`neck`, `forearm` y `tibialis` no corresponden a ningún grupo: quedan siempre en gris de músculo.

Los nombres en castellano salen de lo que ya existe en `ui/components/exercise/ExerciseTexts.kt` (no se duplica la tabla).

## 5. Componente del cuerpo (`ui/components/bodymap/`)

- Un composable reutilizable que recibe **qué partes pintar** (o los grupos) y **qué vista** (frente, espalda o ambas lado a lado) y se dibuja en un `Canvas`, con los trazos parseados una sola vez (`PathParser().parsePathString(d).toPath()`) y escalados al tamaño que le den.
- Colores (de `FtColors`): músculo `#343B39`, neutro `#232927`, pintado `Brand` (`#2952D9`), borde entre partes del color de fondo (`#0B0D0C`), contorno `#3A4240`. Los dos grises nuevos se agregan a `Color.kt` con nombre.
- Accesibilidad: `contentDescription` con lo que se pinta ("Músculo trabajado: Pecho", "Músculos de hoy: pecho, hombros y tríceps").
- La carga del JSON es de solo lectura y no toca la red. Si el asset no se puede leer, el componente no dibuja nada (la pantalla sigue funcionando).

## 6. Sesión activa (`ui/workout/`)

- En `WorkoutContent`, entre `LoadPanel` y el botón principal, la tarjeta compacta con el cuerpo **de frente y espalda lado a lado** (como en el mockup, unos 122 × 112 dp; con una sola vista los ejercicios de espalda, glúteos o isquios no mostrarían nada) y el músculo de `exercise.muscleGroup` (el ejercicio actual de la sesión, que ya está en Room: `data/workout/Workout.kt`). Si se reemplaza el ejercicio, se usa el del reemplazo.
- **Sin grupo, grupo desconocido o `cardio`:** la tarjeta no se muestra. **`full_body`:** se muestra todo pintado con el texto "Cuerpo completo".
- **Línea de abajo (decisión de Claude):** "Barra · 4 series". El backend guarda el equipo en inglés (`barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `kettlebell`, `band`) y la app hoy no lo traduce. Se agrega `equipmentLabel()` en `ExerciseTexts.kt`, al lado de `muscleLabel()`: Barra, Mancuernas, Máquina, Polea, Peso corporal, Kettlebell, Banda; un código desconocido se muestra tal cual. Sin equipo, solo "4 series". La biblioteca no se toca en esta tarjeta.
- La pantalla de la serie **no tiene scroll y el botón principal tiene que verse siempre** (es la regla de la tarjeta 10). Si el alto disponible no alcanza para la tarjeta sin empujar el botón, la tarjeta se oculta.
- En la pantalla del timer (descanso) no cambia nada.

## 7. Hoy (`ui/today/`)

- **Qué grupos cuentan (decisión de Claude):** solo los que pintan algo en el cuerpo, es decir los 10 grupos conocidos menos `cardio`. Los ejercicios sin grupo, con grupo desconocido o de `cardio` no aparecen ni en la fila ni en la hoja (igual que en la sesión activa). Una rutina sin ningún grupo que cuente no muestra la fila.
- La fila nueva va dentro de `RoutineHeroCard`, arriba de "Empezar". Fila de al menos 44 px de alto, tocable entera.
- Texto de la fila: los nombres de los grupos en el orden en que aparecen por primera vez en la rutina, separados por " · ". Si son más de tres, los tres primeros y "+N".
- **Miniatura de la fila (decisión de Claude):** una sola vista, la que tenga más partes pintadas (empate: frente). Así una rutina de espalda y glúteos no queda con una miniatura toda gris.
- La hoja muestra siempre las dos vistas y agrupa los ejercicios que cuentan por `muscleGroup` (en ese mismo orden). Por grupo: nombre, ejercicios separados por " · " y la suma de series (`sets` de cada ejercicio, o 3 si viene nulo, el mismo valor por defecto que la sesión: `DEFAULT_SETS`).
- Solo en el estado `Training` (cuando hoy le toca entrenar). Los días de descanso no cambian.

## 8. Lógica que se testea (tests unitarios, JVM)

- **Mapa de grupos:** cada uno de los 11 grupos devuelve las partes de la tabla del §4; `full_body` devuelve todas las no neutras; grupo nulo o desconocido no devuelve nada.
- **Agregación de la rutina:** orden de aparición, suma de series con el valor por defecto, ejercicios sin grupo / desconocidos / `cardio` ignorados, rutina sin grupos que cuenten (sin fila), el "+N" del texto de la fila y la vista elegida para la miniatura.
- **Textos:** `equipmentLabel()` con los 7 códigos, desconocido y nulo.
- **Datos del dibujo:** el JSON se lee, trae las dos vistas, y todas las partes que nombra la tabla del §4 existen en alguna vista (así un error de tipeo en un slug no pasa en silencio).

La parte visual se prueba a mano en el emulador: las dos pantallas de la tarjeta, con al menos pecho, espalda, piernas, `full_body` y un ejercicio sin grupo.

## 9. Riesgos

- **Pantallas chicas en la sesión activa:** la tarjeta suma unos 130 dp a una pantalla sin scroll. Por eso se oculta si no entra (§6).
- **`TodayScreen.kt`:** la PR #48 (notificaciones) también lo toca. Esta tarjeta cambia `RoutineHeroCard.kt` y, como mucho, unas líneas de `TodayScreen.kt`, así que el conflicto, si aparece, es chico.
- **Tamaño del asset:** unos 45 KB de trazos. Se lee una vez y se guarda en memoria.
