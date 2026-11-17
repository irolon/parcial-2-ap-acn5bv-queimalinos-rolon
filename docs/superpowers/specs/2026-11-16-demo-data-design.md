# Datos de demo (presentación del 18/11)

Fecha: 16/11/2026. Tarjeta MIS 26 (datos de demo, guion y ensayo). Rama `feature/demo-data`.

## Objetivo

Un comando que deja en Supabase dev una entrenadora con alumnos y meses de uso creíbles, para mostrar la web (Pablo) y el celular (Igna) con **las mismas cuentas**. Se puede correr las veces que haga falta: primero borra lo de la demo anterior y después carga todo de nuevo, con fechas relativas al día en que se corre.

## Uso

```bash
cd backend
npm run demo:seed     # borra la demo anterior y carga la nueva
npm run demo:reset    # solo borra
```

Requiere `DEMO_PASSWORD` en `backend/.env` (es la contraseña de todas las cuentas de demo, no se commitea). Solo corre contra Supabase dev (mismo guard que la integración).

## Decisiones

- **Dominio propio** `@demo.fittrainer.dev`: no se cruza con las cuentas QA (`it.%@test.fittrainer.dev`), así `npm run test:integration:clean` no las borra, y el reseteo de la demo solo toca este dominio.
- **Historial insertado directo en la base** (sesiones y series con fechas pasadas): la API pone la hora del servidor al iniciar una sesión, así que no permite cargar ocho semanas de historia. Lo que se calcula a partir del historial (rachas, logros, desafíos, avisos de inactividad, récords) lo hacen **los mismos servicios de la app** después de insertar: `evaluateStudent`, `onSessionClosed` y `runInactivityAlerts`. Así no hay números inventados que no coincidan con lo que calcularía la app.
- **Variación determinística** (pseudoaleatorio con semilla): dos corridas el mismo día dan los mismos datos y los tests son estables.
- **Hoy queda libre**: el historial termina ayer. Martín (el alumno de la demo) entrena lunes, martes, miércoles y viernes, así el miércoles 18 tiene rutina para empezar en vivo.
- **IA**: se carga una plantilla con `generated_by_ai = true` como plan B. En vivo se genera una nueva con n8n + KIMI.

## Qué carga

- **Entrenadora**: Laura Gómez, con disponibilidad de lunes a viernes de 8 a 12 y de 17 a 21, dos ejercicios propios, tres plantillas (una generada con IA) y un desafío "12 sesiones en 30 días".
- **Siete alumnos** con perfiles distintos:
  - Martín: hipertrofia, racha activa, dos rutinas y una lesión leve de hombro.
  - Sofía: bajando de peso.
  - Lucas: fuerza avanzada.
  - Valentina: entrena en la plaza.
  - Diego: dejó de venir hace 12 días, para el aviso de inactividad.
  - Camila: con sustituciones de ejercicio.
  - Joaquín: recién sumado, sin sesiones.
- **Invitación pendiente**: una a nombre de Agustina.
- **Historial**: hasta ocho semanas de sesiones con progresión de cargas, RPE, notas, comentarios del PT, medidas cada dos semanas, mensajes, consultas al asistente, turnos (pendientes, confirmados y uno cancelado) y notificaciones.

## Criterio de aceptación

1. `npm run demo:seed` dos veces seguidas termina sin error y deja los mismos alumnos (no duplica).
2. Con la cuenta de Laura, la web muestra el dashboard con actividad, el panel con un alumno inactivo, progreso con curvas ascendentes, agenda con turnos y notificaciones.
3. Con la cuenta de Martín, el miércoles hay rutina para hoy, la racha es mayor que 0 y hay logros.
4. `npm run demo:reset` deja la base sin nada de `@demo.fittrainer.dev`.
