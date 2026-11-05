# Pruebas de la web — diseño (tarjeta 53 · MIS 25)

- **Tarjeta:** equipo 53 · [Pruebas de la web y de la app Android](https://trello.com/c/bHlPgRR9) (compartida: la web es de Pablo, el celular de Igna) · MIS 25
- **Fecha:** 2026-11-05 · grilling Q1–Q8 cerrado con Pablo
- **Rama:** `test/web-qa` (desde `develop` 766ae0f)

## 1. Objetivo

Recorrer la web a mano con los dos roles, sobre todo los cuatro flujos críticos y las condiciones feas. Dejar documentados los bugs que aparezcan y arreglados los críticos, y estabilizar los tests de la web que fallan de a ratos.

**Criterio de aceptación de la tarjeta (parte web):** los cuatro flujos críticos pasan en la web con los dos roles; los bugs encontrados están documentados y los críticos, arreglados.

## 2. Decisiones

**Q1 · Lo que cruza con el celular.** El lado web se prueba de punta a punta. El lado del celular se simula por la API con los mismos requests que manda la app: `POST /sessions` con UUID del cliente, `POST /sessions/:id/sets` en lote, el reintento del mismo lote y `executed_at` atrasado (modo avión), para verificar que la web muestra bien lo que llega. El cruce con un celular físico queda como caso para Igna en su parte de la tarjeta 53.

**Q2 · Pruebas a mano.** En el navegador integrado contra el backend local (`npm run dev`) y Supabase dev. Las cuentas se crean por la API con emails de QA (`it.web<corrida>.<rol>@test.fittrainer.dev`) y se borran con `npm run test:integration:clean`. La checklist sale de las funcionalidades numeradas de la Guía Web (p. 5–15), por rol y por pantalla, más los guards de rol (un PT en rutas de alumno y al revés). Capturas en `docs/superpowers/specs/assets/53/`.

**Q3 · Sin E2E automático nuevo.** No se suma Playwright. Los flujos críticos ya están automatizados contra la API real (suite de integración, #76) y las pantallas por los tests de Vitest y Testing Library.

**Q4 · Tests inestables.** Se busca la causa de cada uno (timeouts de `userEvent`, `waitFor` mal puesto, estado compartido) en vez de subir los timeouts. Criterio: 3 corridas completas seguidas en verde con la configuración del CI (`npx vitest run --maxWorkers=2 --testTimeout=15000`) y 1 con la configuración por defecto (`npm test`). Línea base: las 4 corridas del 05/11 antes de tocar nada.

**Q5 · Condiciones feas en la web.**
- Backend caído o sin red a mitad de una sesión de entrenamiento: las series quedan en el navegador y "Reintentar" no duplica.
- Sesión vencida: backend local con `JWT_EXPIRES_IN=60s`; el refresh tiene que ser transparente, y si el refresh falla, la web lleva al login sin perder lo que estaba en curso.
- Internet lento: un retardo artificial en el backend local (middleware temporal, no se commitea).
- Dos pestañas a la vez y recargar a mitad de la sesión.
- Batería y giro de pantalla son del celular: no aplican a la web.

**Q6 · Notebook chica.** 1366×768 y 1280×720 con zoom al 100 %: todas las pantallas de los dos roles sin scroll horizontal y con la acción principal visible.

**Q7 · Bugs.** Documento nuevo `docs/proceso/pruebas-web.md`, linkeado desde `plan-de-pruebas.md` (como la auditoría, para no chocar con la reescritura de la #76). Cada bug va con número, pantalla, pasos, esperado y obtenido, severidad y estado.
- **Crítico:** pérdida de datos, un flujo crítico que no se puede terminar, datos de otro usuario o datos mal mostrados. Se arregla en esta tarjeta.
- **Menor:** se arregla si lleva menos de 30 minutos; si no, queda documentado.

**Q8 · Rama y PR.** Una PR `test/web-qa` con el documento, los tests estabilizados y los arreglos chicos. Un bug grande va en su propia PR `fix/...`.

## 3. Fuera de alcance

- La app Android (Igna, tarjeta 53).
- E2E automático con navegador.
- Pruebas en producción: van en la verificación post-deploy (tarjeta 54).
