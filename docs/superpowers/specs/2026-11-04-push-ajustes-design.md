# Ajustes de push en el celular (04/11, después de la #70 y la #72)

Seguimiento chico de las revisiones de la #70 (push de mensaje) y la #72 (logout borra el push token). Igna lo
aprobó el 04/11 («arrancá con la PR chica»). Rama `feature/android-push-ajustes`, base `develop`.

## 1. Un aviso por conversación, con la app abierta o cerrada

**Problema.** Desde la #70, el backend manda el push `message` con `android.notification.tag = "message:<student_id>"`. Con la app en segundo plano, ese push lo muestra el SDK de FCM con ese tag y el **id 0**. En primer plano lo mostraba la app con el tag `push:message:<student_id>` y el id 3001. Android identifica cada aviso por el par (tag, id), así que un mensaje que llegaba con la app abierta y otro de la misma conversación que llegaba con la app minimizada quedaban como dos avisos. Lo marcó Codex en la ronda 3 de la #70.

**Arreglo.** `pushSlot(data)` (`PushRefresher.kt`) devuelve el par:
- **push `message` con alumno:** `("message:<student_id>", 0)`, el mismo par que usa FCM;
- **el resto:** `("push:<notification_id o un código>", 3001)`, igual que antes, para no chocar con `WorkoutNotifications` (1001 y 1002).

## 2. El logout manda el push token y se reintenta sin red

**Problema.**
- Hoy el cierre de sesión primero da de baja el token con `DELETE /notifications/tokens/:token`, que necesita el JWT y red, y después revoca con `POST /auth/logout`.
- Sin red no se hace ninguna de las dos cosas: el refresh token sigue vivo en el servidor y el celular sigue recibiendo los push de esa cuenta, que ahora incluyen el texto del chat.

**Arreglo.**
- **El logout lleva el token.** `PushTokenRegistry.unregister()` devuelve el token que leyó, aunque el DELETE haya fallado. `TokenSessionRepository.signOut()` se lo pasa a `AuthRepository.logout(pushToken)`, que manda `{ refresh_token, push_token }`. Sin token, el campo no viaja: el backend rechaza `push_token: null`.
- **Lo que no llegó se reintenta.** Si no llegó al backend, queda en `LogoutRetryQueue`. Cuenta como «no llegó»:
  - una excepción, por ejemplo sin red;
  - un 5xx, 408 o 429;
  - un 401 que no se resolvió renovando el access.

  Con un 2xx o con otro 4xx el logout se da por terminado.
- **Dónde se guarda.** `PendingLogoutStore` es un DataStore cifrado con Tink, con el mismo keyset que la sesión y su propia associated data, porque guarda refresh tokens. Cada refresh aparece una sola vez y se guardan a lo sumo 10, los más nuevos.
- **Quién lo reenvía.** `LogoutRetryWorker` es el trabajo único `logout-retry`: corre solo con red, con backoff exponencial y APPEND_OR_REPLACE. Manda cada pendiente **sin access token**, porque el backend no lo pide y el de esa sesión ya no existe, y saca los que llegaron.
- **Se guarda antes, no después** (Codex, ronda 1). `AuthRepository.logout` guarda el pendiente (`hold`) antes de cerrar la sesión local y de esperar la red, y lo suelta (`release`) si llegó. La pasada queda programada desde ese momento con 30 s de demora, así que si matan el proceso o cancelan el logout a mitad, WorkManager la corre igual. Si el envío directo llegó, la pasada encuentra la lista vacía.
- **La baja no le quita el push a una sesión nueva** (Codex, ronda 1). El token de push es del celular: si alguien vuelve a entrar antes del reintento, su alta registra el mismo token y la baja pendiente se lo borraría. Por eso, si la pasada borró algún token, vuelve a registrar el de la sesión actual (`registerIfSignedIn`), y el alta siempre queda después de la baja.
- **La pasada queda programada de verdad** (Codex, ronda 2). `WorkManagerLogoutRetryScheduler` espera la `Operation` del encolado (`await`). Si el encolado falla, o el proceso muere entre guardar el pendiente y programar la pasada, el pendiente ya está en disco y `FitTrainerApp` llama a `LogoutRetryQueue.resume()` al arrancar, que la programa si hay algo por hacer.
- **El alta se confirma** (Codex, ronda 2). La pasada saca los pendientes que llegaron y, en la misma escritura, suma una marca de «falta el alta» si borró algún token. La marca se confirma recién cuando `PushTokenRegistry.registerCurrent()` confirma el alta, o cuando no hay sesión y no hay nada que restaurar. Si el alta falla, la pasada pide reintento; si la cancelan, la marca queda en disco.
- **El envío directo también avisa** (Codex, ronda 3). Si el logout directo tardó, alguien pudo volver a entrar antes de que llegara la baja. Por eso `release(refresh, pushTokenRemoved)` saca el pendiente y, cuando mandó un token de push, suma una marca en la misma escritura y programa la pasada que confirma el alta.
- **Marcas numeradas** (Codex, ronda 4). `reregisterMarks` y `reregisterConfirmed` reemplazan al booleano. Cada baja suma una marca, y un alta confirma hasta la marca que vio antes de pedirse. Si mientras el alta estaba en vuelo llegó otra baja (el logout directo), esa marca queda sin confirmar, la pasada pide reintento y la pasada programada por ese logout la restaura.
- **Por qué funciona el reintento.** El backend encuentra al dueño del refresh aunque ya esté revocado o vencido (#72), y borra el push token solo si es de ese dueño.
- **Qué no cambia.** El DELETE con JWT sigue antes del logout, y sigue siendo la vía rápida cuando hay red.

## Fuera de alcance

- `has_image` (#73) en el chat del celular: lleva una migración Room, va en otra PR.
- La prueba con FCM real y un celular físico (transición entre primer y segundo plano, logout sin red y vuelta de la red), cuando entren la #70 y la #72.
