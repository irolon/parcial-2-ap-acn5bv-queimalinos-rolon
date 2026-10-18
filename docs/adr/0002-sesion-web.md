# ADR 0002 — Sesión de la web: access en memoria, refresh en localStorage

- **Estado:** aceptado
- **Fecha:** 2026-10-18

## Contexto

La web consume la API REST del backend, que emite dos tokens al iniciar
sesión: un access token de vida corta y un refresh token para pedir uno nuevo.
Hay que decidir dónde guardarlos en el browser. Cualquier cosa que el
JavaScript de la página pueda leer queda al alcance de un XSS; pero si la
sesión no persiste, el entrenador tiene que volver a loguearse en cada recarga.

La decisión ya está implementada desde el esqueleto de la web (PR #19):
`frontend/src/hooks/auth/useAuthStore.js` y `frontend/src/api/shared/client.js`.

## Decisión

1. El **access token vive solo en memoria** (estado del store de Zustand). No
   se escribe en `localStorage`: una recarga lo pierde y un XSS no lo encuentra
   guardado.
2. El **refresh token y el `user`** se guardan en `localStorage`
   (`fittrainer.session`), para que la sesión sobreviva a recargas y a cerrar
   la pestaña. Es lo único que persiste (`partialize`).
3. **Restauración al cargar:** `restore()` usa el refresh guardado para pedir un
   access nuevo (`status`: `idle` → `loading` → `authenticated` | `anonymous`).
4. **Renovación automática:** el cliente de API, ante un 401 `UNAUTHORIZED`,
   renueva la sesión una vez y reintenta la llamada. Varias llamadas que fallan
   a la vez comparten la misma renovación. Las rutas de `/auth/*` no renuevan,
   para no entrar en bucle.
5. **Si la renovación falla** con un error real (refresh vencido o inválido), se
   hace logout y el router manda a `/login`.
6. **Si el servidor no responde** (error de red), la sesión no se descarta: se
   descarta solo el access, el estado pasa a `anonymous` y `user` y refresh
   quedan guardados para reintentar en la próxima carga. Un corte de red no
   debería desloguear al usuario.

## Alternativas

- **Todo en `localStorage`** (access incluido): más simple, pero el token que
  da acceso a la API queda legible por cualquier script inyectado.
- **Todo en memoria:** el más seguro frente a XSS, pero cada recarga o pestaña
  nueva obliga a volver a loguearse.
- **Refresh en cookie HttpOnly:** descartada por ahora. Es la opción más
  resistente al XSS, pero exige cambios de backend (emitir y rotar la cookie,
  `SameSite`, protección CSRF) y de CORS (`credentials` y origen explícito), que
  no entran en esta etapa.

## Consecuencias

- Un XSS no puede robar el access token guardado, pero sí leer el refresh de
  `localStorage` y usarlo para obtener accesos nuevos hasta que se revoque. La
  mitigación es el logout (que revoca el refresh en el backend), la vida corta
  del access y evitar HTML sin sanitizar en la web.
- Cada recarga hace una llamada de refresh antes de mostrar las rutas
  protegidas; mientras tanto el router espera el estado `loading`.
- Si algún día se pasa a cookie HttpOnly, hay que cambiar el backend y el CORS,
  reemplazar la persistencia del refresh en el store y actualizar este ADR.
