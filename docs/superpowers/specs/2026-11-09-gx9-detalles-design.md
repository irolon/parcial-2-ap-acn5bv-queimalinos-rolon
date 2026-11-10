# GX9 · Detalles: actividad de 30 días, filtro por adherencia y "Sin conexión, reintentando" — diseño

Ticket 9 de 9 del lote GX. Una PR. Rama sugerida: `feature/web-details-gx9`. **La parte (a) sale después de la #91** y la (c) después de la #85 (ver el chequeo); (b) no depende de nadie.

## Contexto

- **(a) E1 · Dashboard**, "Gráfico de actividad": "Sesiones completadas por día, con selección de período." La #91 (GW1) agrega `daily` a `GET /students/overview` con **14** filas y `ActivityChart` con 7D / 14D. Falta un período de un mes.
- **(b) E2 · Panel de alumnos**, "Filtros y ordenamiento". La GW2 (en `develop`) sumó la barra y el **orden** por adherencia, y su decisión 6 dejó afuera un filtro por adherencia. Pablo lo pide ahora: rangos ≥ 70, 50–69, < 50 y sin plan, los mismos umbrales de la barra (`ADHERENCE_GOOD` / `ADHERENCE_OK` de `utils/students/adherence.js`, iguales al celular).
- **(c) B6** de `docs/proceso/pruebas-web.md`: "Apagar el backend y recargar" → "Manda al login, aunque la sesión sigue guardada". Esperado: "Un estado 'Sin conexión, reintentando' en vez del login." Hoy `restore()` (`hooks/auth/useAuthStore.js`) ante un error transitorio (`isTransientError`: red o 429) llama a `keepSessionOffline`, que deja `user` y `refreshToken` pero pone `status: 'anonymous'`, y los guards (`routes/guards.jsx`) mandan a `/login`.

## Decisiones

| # | Decisión |
|---|---|
| 1 | Tres detalles chicos en una PR. Si la #91 se demora, (b) y (c) se hacen primero y (a) al final, sin PR apilada. |
| 2 | **(a)** `daily` pasa de 14 a **30 filas** (hoy − 29 a hoy) y la consulta de sesiones del overview de 14 a 30 días. Las demás cifras no cambian: la adherencia, la lista de hoy y el feedback pendiente filtran su propia ventana (`adherence7d`, `todayList`, `feedbackList`). |
| 3 | **(a)** Selector **7D · 14D · 30D**, por defecto 7D (como la #91). En 30D el eje X muestra el número de día ("09") cada 5 barras en lugar de la inicial. |
| 4 | **(b)** Select nuevo **"Adherencia"** junto a Objetivo, Estado y Orden: Todas · Alta (70 % o más) · Media (50 a 69 %) · Baja (menos de 50 %) · Sin plan. En la URL `?adherencia=alta|media|baja|sin-plan`; se combina con los demás filtros y con cualquier orden. Revisa la decisión 6 de la GW2 por pedido de Pablo. |
| 5 | **(b)** "Sin plan" = `pct null`: incluye "Sin días todavía" (rutina recién asignada), igual que el orden por adherencia los manda al final juntos. |
| 6 | **(c)** Estado nuevo **`offline`** en `useAuthStore`: sesión guardada, sin verificar porque el servidor no responde. Los guards lo muestran como "Sin conexión, reintentando" y **no** borran la sesión. |
| 7 | **(c)** Transitorio = red caída (`status 0`), 429 **y cualquier 5xx** del refresh (en producción nginx devuelve 502/503/504 con el backend caído). Solo un rechazo del servidor (400/401/403) borra la sesión y manda al login. |
| 8 | **(c)** Reintento con espera creciente 2 s, 4 s, 8 s, 16 s y después cada 30 s; también al instante con el evento `online` del navegador y con el botón "Reintentar ahora". Sin tope de intentos. |
| 9 | **(c)** El mismo `offline` se usa si la renovación falla a mitad de uso (`onAuthFailure` con error transitorio): la pantalla de "Sin conexión" reemplaza a la página en vez del login; el entrenamiento en curso no se pierde (`workoutStorage`). |

## Diseño

**(a) Actividad de 30 días.** Backend: `DAILY_DAYS = 30` en `models/students/overview-daily.js` y la ventana de `overview.service.js` (`WINDOW_DAYS`) a 30, con el comentario "hoy y los 30 días anteriores: el gráfico; la adherencia y las listas recortan la suya". Web: `PERIODS = [7, 14, 30]` en `ActivityChart`; con 30, `XAxis` usa `tickFormatter={dayNumber}` e `interval={4}`; el tooltip ("Lunes 09/11 · 3 sesiones") no cambia. Título "Actividad · 30 días"; el vacío "Ninguna sesión terminada en los últimos 30 días". La última barra (hoy) sigue en `accent`.

**(b) Filtro por adherencia.** `utils/students/adherence.js` suma `adherenceBucket(student)` → `'alta' | 'media' | 'baja' | 'sin-plan'` con los umbrales existentes. `studentFilters.js`: `DEFAULT_FILTERS.adherencia = ''`, `ADHERENCIAS`, lo parsea (inválido → todas) y `filterStudents` lo aplica. `StudentFilters.jsx`: cuarto `Select` "Adherencia"; la grilla pasa a `sm:grid-cols-2 lg:grid-cols-4`. Sin resultados, el vacío que ya existe ("Ningún alumno coincide"). La navegación anterior/siguiente de la ficha (`StudentProfilePage` usa `filterStudents` con los mismos parámetros) respeta el filtro sin cambios.

**(c) Sin conexión, reintentando.**
- `useAuthStore`: `keepSessionOffline` pasa a `set({ token: null, status: 'offline' })`. Acción nueva `retry()`: si el estado es `offline`, pide `authApi.refresh(refreshToken)` **sin** pasar por `loading` (la pantalla no parpadea); éxito → `authenticated`; transitorio → sigue `offline`; otro error → sesión vacía y `anonymous`. `isTransientError` suma `status >= 500`. Estados documentados: `idle → loading → authenticated | anonymous | offline`.
- `hooks/auth/useSessionRetry.js`: mientras el estado es `offline`, programa `retry()` con la espera de la decisión 8, escucha `online` y expone `{ secondsLeft, retrying, retryNow }`; al desmontar limpia el timer y el listener.
- `components/shared/states/SessionOffline.jsx`: pantalla completa (mismo marco que `SessionLoading`) con ícono `WifiOff`, título "Sin conexión con el servidor", texto "Tu sesión sigue guardada. Reintentando en 8 s…" (o "Reintentando…" durante el pedido), botón "Reintentar ahora" y botón ghost "Cerrar sesión" (`logout()`: limpia aunque el backend no conteste). `role="status"` y `aria-live="polite"` en el texto del reintento.
- `routes/guards.jsx`: `RequireRole`, `GuestOnly` y `RootRedirect` muestran `SessionOffline` con `status === 'offline'`; al volver a `authenticated` renderizan la ruta pedida (la URL no cambió, así que se vuelve a la misma pantalla). `pages/students/JoinPage.jsx` hace lo mismo (hoy solo mira `idle`/`loading`).
- `useClearCacheOnSessionChange` no cambia: `offline` conserva el `user`, así que no vacía la caché.

## Datos

- `GET /students/overview` → `daily`: **30** filas `{ date, count }` ascendentes (antes 14). Aditivo para el celular, que no lo lee. Actualizar la línea de `daily` en `docs/arquitectura/contratos-api.md` (la escribe la #91).
- (b) y (c): sin cambios de backend ni de contrato; (c) usa `POST /auth/refresh` como hoy.

## Archivos que toca

**(a)** — todos **de la #91**:
- Modifica `backend/src/models/students/overview-daily.js` (24, 1 línea), `backend/src/services/students/overview.service.js` (50, 2 líneas), `frontend/src/components/students/overview/ActivityChart.jsx` (71, ~76), `frontend/src/utils/students/overviewFormat.js` (35, +2: `dayNumber`), `docs/arquitectura/contratos-api.md`.
- Tests (modifica): `backend/tests/unit/models/students/overview-daily.test.js` (64), `backend/tests/unit/services/students/overview.service.test.js` (58), `frontend/tests/components/students/overview/ActivityChart.test.jsx` (57, +15), `frontend/tests/utils/students/overviewFormat.test.js` (67, +5), `frontend/tests/helpers/students/overview.js` (45: el `daily` de ejemplo con 30 filas).

**(b)**
- Modifica `frontend/src/utils/students/adherence.js` (26, +8), `frontend/src/utils/students/studentFilters.js` (99, ~110), `frontend/src/components/students/StudentFilters.jsx` (44, ~53).
- Tests (modifica): `frontend/tests/utils/students/adherence.test.js` (46, +12), `frontend/tests/utils/students/studentFilters.test.js` (148, +20), `frontend/tests/pages/students/StudentsPage/filters.test.jsx` (87, +20).

**(c)**
- Crea `frontend/src/hooks/auth/useSessionRetry.js`, `frontend/src/components/shared/states/SessionOffline.jsx`.
- Modifica `frontend/src/hooks/auth/useAuthStore.js` (112, ~128), `frontend/src/routes/guards.jsx` (54, ~60), `frontend/src/pages/students/JoinPage.jsx` (74, +2), `docs/proceso/pruebas-web.md` (B6 resuelto; F4 y "Recargar a mitad de la sesión" con el comportamiento nuevo).
- Tests (crea): `frontend/tests/hooks/auth/useAuthStore/offline.test.js`, `frontend/tests/hooks/auth/useSessionRetry.test.jsx`, `frontend/tests/components/shared/states/SessionOffline.test.jsx`.
- Tests (modifica): `frontend/tests/hooks/auth/useAuthStore/rate-limit.test.js` (38) y `session.test.js` (63) (esperan `offline` en vez de `anonymous`), `frontend/tests/routes/guards.test.jsx` (127, +30), `frontend/tests/pages/students/JoinPage.test.jsx` (156, +12).

**Chequeo contra PRs abiertas.**
- **#91**: `overview-daily.js`, `overview.service.js`, `ActivityChart.jsx`, `overviewFormat.js`, sus tests, el helper y la línea del contrato son suyos (algunos no existen en `develop`). (a) se hace **con la #91 mergeada**.
- **#85** (chat IA): modifica `useAuthStore.js` (importa `isNetworkError` de `api/shared/client.js` y retoca `renewAccessToken`; el resto de su diff ya está en `develop`). Choca en las líneas de `isTransientError`: **después de la #85**, o se resuelve a mano manteniendo su import. No toca `guards.jsx`.
- **#93**: toca `StudentsPage.jsx` y `StudentsPage/list.test.jsx`; este ticket no toca la página (el select vive en `StudentFilters.jsx`) y su test va en `filters.test.jsx`.
- **#84**: toca `routes/router.jsx`, `routeTable.js` y `useClearCacheOnSessionChange.js`; este ticket no los toca.

## Pruebas

**Jest (backend)**: `dailySessions` da 30 filas de hoy − 29 a hoy, cuenta por `finished_at` y deja en 0 los días sin sesiones; el service pide sesiones desde hoy − 30; una sesión de hace 20 días suma en `daily` y no en la adherencia de 7 días.

**Vitest**
- `ActivityChart`: botón 30D con `aria-pressed`, título "Actividad · 30 días", 30 barras, marcas con número de día; vacío de 30 días.
- `adherenceBucket`: 70 → alta, 69 → media, 50 → media, 49 → baja, `null` y sin `adherence_7d` → sin-plan.
- `studentFilters`: parsea `adherencia`, ignora valores inválidos, la omite de la URL si es la por defecto, filtra combinada con estado y objetivo.
- `StudentsPage/filters`: elegir "Baja" deja solo los de < 50 % y pone `?adherencia=baja`; con `?orden=adherencia` los ordena; sin coincidencias, el vacío.
- `useAuthStore/offline`: refresh con red caída, 429 o 502 → `offline` con `user` y `refreshToken` guardados; 401 → `anonymous` y sesión vacía; `retry()` exitoso → `authenticated` sin pasar por `loading`; `onAuthFailure` transitorio → `offline`.
- `useSessionRetry`: con timers falsos reintenta a los 2, 4 y 8 s; el evento `online` reintenta enseguida; deja de reintentar al salir de `offline`.
- `SessionOffline`: cuenta atrás, "Reintentar ahora" llama a `retry`, "Cerrar sesión" limpia y lleva al login.
- `guards`: con `offline` una ruta privada muestra "Sin conexión con el servidor" y no navega a `/login`; al pasar a `authenticated` muestra la página pedida; `/login` y `/` también muestran la pantalla.

**Navegador:** dashboard de QA con sesiones en el último mes; panel con alumnos en los cuatro rangos; para B6, backend apagado y recarga en `/pt/alumnos` y en una sesión de entrenamiento del alumno, después backend arriba. Capturas en `docs/superpowers/specs/assets/gx9/` (`01-actividad-30d.jpg`, `02-filtro-adherencia-baja.jpg`, `03-filtro-angosto-375.jpg`, `04-sin-conexion-reintentando.jpg`, `05-reconectado-misma-pantalla.jpg`).

## Criterio de aceptación

- El gráfico de actividad del dashboard ofrece 7, 14 y 30 días y el de 30 se lee sin marcas encimadas.
- En Alumnos se filtra por rango de adherencia, combinable con los demás filtros y el orden, y el filtro queda en la URL.
- Con el backend caído, recargar muestra "Sin conexión con el servidor" y reintenta solo; al volver el backend, entra a la misma pantalla sin pedir login. Una sesión inválida (401) sigue mandando al login.
- Lint y tests en verde (backend y web); ningún archivo pasa de 200 líneas.

## Estimación

**10 h**: (a) 2 h (backend 0,5, web 0,5, tests 1); (b) 2 h (lógica y select 1, tests 1); (c) 5 h (store y reintento 1,5, pantalla y guards 1,5, tests 2); navegador, `pruebas-web.md` y capturas 1 h.

## Fuera de alcance

- Períodos personalizados o más de 30 días en el gráfico; comparar con el período anterior.
- Filtrar por adherencia en el backend (`GET /students` sigue filtrando en el cliente).
- Usar la web sin conexión (navegar con datos en caché mientras el servidor no responde) y un aviso no bloqueante de "sin conexión" dentro de las páginas.

## Tarjetas para el celular (Igna)

1. **Filtro por adherencia en la lista de alumnos del PT** (`ui/students`): mismos cuatro rangos con los umbrales de `adherenceColor`, sobre `adherence_7d` de `GET /students` (ya lo recibe). Solo si se quiere paridad: la Guía no lo pide para el celular.
2. (a) Gráfico de 30 días: **ninguna** (el celular no usa `daily`).
3. (c) Sin conexión: **ninguna** (el celular ya funciona offline con su sesión cifrada y el refresh diferido).
