# GX9 (c) · Sin conexión, reintentando — plan

> Para agentes: implementar tarea por tarea con TDD (test que falla → código → test en verde → commit).

**Objetivo:** con el backend caído, recargar (o una renovación del token que falla a mitad de uso) muestra "Sin conexión con el servidor" y reintenta solo, en vez de mandar al login. Solo un rechazo del servidor (400/401/403) borra la sesión.

**Arquitectura:** estado nuevo `offline` en `useAuthStore` (sesión guardada sin verificar) con la acción `retry()`; el hook `useSessionRetry` agenda los reintentos; la pantalla `SessionOffline` la muestran los guards y `JoinPage`.

**Stack:** React 19 + Zustand + React Router + Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-09-gx9-detalles-design.md` (solo la parte (c): decisiones 6 a 9).

## Restricciones globales

- Ningún archivo pasa de 200 líneas (tests incluidos); carpetas de hasta 10 entradas; los tests copian el árbol de `src/`.
- Transitorio = `isNetworkError(err)` (import de `api/shared/client.js`, de la #85) || 429 || `status >= 500`.
- Espera entre reintentos: 2 s, 4 s, 8 s, 16 s y después cada 30 s; sin tope. También al instante con `online` y con "Reintentar ahora".
- Textos: título "Sin conexión con el servidor"; "Tu sesión sigue guardada. Reintentando en N s…" / "Reintentando…"; botones "Reintentar ahora" y "Cerrar sesión" (ghost).
- vitest con `--maxWorkers=2`, solo los archivos afectados mientras se itera.

## Foco de la revisión

- "Cerrar sesión" mientras hay un `retry()` en vuelo: la respuesta no debe revivir la sesión (`retry` compara el `refreshToken`). Test en la tarea 1.
- Volver a `authenticated` vuelve a la misma URL (no a la home ni al login). Test en la tarea 3.
- Un entrenamiento en curso (`workoutStorage`) sobrevive al estado `offline`. Test en la tarea 3.
- `useClearCacheOnSessionChange` no vacía la caché al pasar a `offline`. Test en la tarea 1.
- Desmontar la pantalla (vuelve la conexión) limpia el timer y el listener de `online`. Test en la tarea 2.

---

### Tarea 1: `offline` y `retry()` en `useAuthStore`

**Archivos:** modifica `frontend/src/hooks/auth/useAuthStore.js`; crea `frontend/tests/hooks/auth/useAuthStore/offline.test.js`; actualiza `login.test.js` y `rate-limit.test.js` (esperan `offline`) y `tests/hooks/auth/useClearCacheOnSessionChange.test.jsx` (+1 caso).

**Produce:** `status: 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'offline'`; `retry(): Promise<void>` (no hace nada fuera de `offline`; no pasa por `loading`).

- [ ] Test que falla `offline.test.js`: `restore()` con red caída, 429 y 502 → `{ user: USER, token: null, refreshToken: 'refresh-1', status: 'offline' }` y lo guardado intacto; 401 → `anonymous` y sesión vacía; `retry()` exitoso → `authenticated` con el token nuevo y sin ver nunca `loading` (suscripción al store); `retry()` transitorio → sigue `offline`; `retry()` con 401 → `anonymous` vacío; `retry()` fuera de `offline` no llama a la API; logout durante el `retry()` → queda `anonymous`; `onAuthFailure` con 502 → `offline`.
- [ ] Correr: `npx vitest run tests/hooks/auth --maxWorkers=2` → falla.
- [ ] Implementar: `isTransientError` suma `err?.status >= 500`; `keepSessionOffline` pone `status: 'offline'`; `retry()`; doc de estados.
- [ ] Actualizar los tests que esperaban `anonymous` en errores transitorios; caso nuevo en `useClearCacheOnSessionChange`: pasar a `offline` no toca la caché.
- [ ] Correr de nuevo → verde. Commit `feat(auth): estado offline y retry() en la sesión cuando el servidor no responde`.

### Tarea 2: `useSessionRetry`

**Archivos:** crea `frontend/src/hooks/auth/useSessionRetry.js` y `frontend/tests/hooks/auth/useSessionRetry.test.jsx`.

**Consume:** `useAuthStore` (`status`, `retry`). **Produce:** `useSessionRetry(): { secondsLeft: number, retrying: boolean, retryNow: () => Promise<void> }`; `retryDelay(attempt: number): number` (segundos).

- [ ] Test que falla (timers falsos, `stubFetch` con red caída y conteo de `/auth/refresh`): reintenta a los 2 s, luego 4 s y 8 s más tarde; `secondsLeft` baja de a 1; el evento `online` reintenta enseguida; con refresh OK pasa a `authenticated` y no vuelve a pedir; al salir de `offline` no reintenta más; al desmontar no reintenta ni escucha `online`; `retryDelay` da 2, 4, 8, 16, 30, 30.
- [ ] Implementar: intervalo de 1 s que baja `secondsLeft` y al llegar a 0 llama a `retryNow`; cada intento terminado suma `attempt`; un solo pedido a la vez (ref).
- [ ] Verde. Commit `feat(auth): reintento de la sesión con espera creciente y al volver la red`.

### Tarea 3: `SessionOffline`, guards y `JoinPage`

**Archivos:** crea `frontend/src/components/shared/states/SessionOffline.jsx` y `frontend/tests/components/shared/states/SessionOffline.test.jsx`; modifica `frontend/src/routes/guards.jsx`, `frontend/src/pages/students/JoinPage.jsx`, `frontend/tests/routes/guards.test.jsx`, `frontend/tests/pages/students/JoinPage.test.jsx`.

**Consume:** `useSessionRetry`, `logout()`.

- [ ] Test que falla `SessionOffline`: muestra el título y "Reintentando en 2 s…" que baja a 1 s; `role="status"` con `aria-live="polite"`; "Reintentar ahora" pide `/auth/refresh`; "Cerrar sesión" (vía `renderRoute`) limpia el store y lleva a `/login`.
- [ ] Test que falla `guards`: con `offline`, `/pt/alumnos`, `/login` y `/` muestran "Sin conexión con el servidor" y la URL no cambia; al pasar a `authenticated`, la ruta privada muestra su página; el entrenamiento guardado del alumno sigue en localStorage.
- [ ] Test que falla `JoinPage`: con `offline` muestra la pantalla y no pide la invitación.
- [ ] Implementar la pantalla (ícono `WifiOff`, mismo marco que `SessionLoading`) y el chequeo `status === 'offline'` en `RequireRole`, `GuestOnly`, `RootRedirect` y `JoinPage`.
- [ ] Verde. Commit `feat(auth): pantalla "Sin conexión con el servidor" en los guards y en la invitación`.

### Tarea 4: documentación y verificación

- [ ] `docs/proceso/pruebas-web.md`: B6 resuelto; F4 y "Recargar a mitad de la sesión" con el comportamiento nuevo. Commit `docs(web): B6 resuelto con el estado sin conexión`.
- [ ] Suite web completa una vez (`npx vitest run --maxWorkers=2`), `npx eslint .`, `npm run build`. Push de la rama.
