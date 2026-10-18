# Spec — Auth e invitaciones en la web

- **Tarjeta:** "5 · Auth y generación de invitaciones en la web" (tablero personal de Pablo) → tarjeta de equipo https://trello.com/c/nSj2TMQq
- **Fecha:** 2026-10-18
- **Rama:** `feature/web-auth-invitations`, que sale de `feature/web-skeleton` (PR #19, todavía sin mergear). La PR es apilada: apunta a `feature/web-skeleton` y, cuando se mergee la #19, se le cambia el destino a `develop`.
- **Reglas:** `CONTRIBUTING.md` (200 líneas por archivo, capa → módulo → archivo, tests espejados) y el spec del esqueleto (`2026-10-18-web-skeleton-design.md`), del que esta tarjeta reutiliza el cliente, el store, los componentes y los estados.
- **Diseño:** prototipo web E5 "Invitar alumno" (`docs/design/prototype-src/pt-screens.jsx`, `PTGenerarQR`) y el CTA "Generar QR" del sidebar (`pt-dashboard.jsx`). No hay mockup de registro ni de `/join`: se arman con los componentes del manual, en el mismo estilo que el login.
- **Backend:** `auth/register`, `invitations` y `students` de `develop`.

## 1. Objetivo

El entrenador se registra solo, invita a un alumno con un QR o por WhatsApp en menos de un minuto, y el alumno puede darse de alta también desde la web.

**Criterio de aceptación (de la tarjeta):** un entrenador se registra desde cero, entra al dashboard y genera una invitación. El QR se ve en pantalla y se puede descargar. El botón de WhatsApp abre la app con el mensaje precargado.

## 2. Decisiones tomadas

### Registro del entrenador (`/registro`, pública)
- Campos:
  - nombre y apellido (2 a 100 caracteres);
  - email;
  - contraseña: 8 caracteres o más, con una mayúscula y un número; la regla se muestra debajo del campo;
  - especialidad (opcional).
- **Sin foto de perfil**, porque el backend no la soporta. Queda en la tarjeta deseable "Foto de perfil del alumno y del entrenador" (https://trello.com/c/uOye28OK).
- El login y el registro se linkean entre sí: "¿No tenés cuenta? Registrate" y "¿Ya tenés cuenta? Ingresá".
- Al registrarse queda con la sesión iniciada y va a `/pt/dashboard`.
  - El 201 trae `{ trainer, token, refresh_token }`, sin `role`.
  - El store suma una acción `register(data)` que guarda `user = { ...trainer, role: 'trainer' }` igual que el login.
  - `auth.api.js` suma `register()`, con `auth: false` y `refresh: false`.
- Errores:
  - `EMAIL_ALREADY_EXISTS` → "Ya existe una cuenta con ese email", en el campo email;
  - `VALIDATION_ERROR` → cada error en su campo;
  - sin red → mensaje general.
- `GuestOnly` también envuelve `/registro`: con sesión, redirige a la home del rol.

### Nuevo alumno (`/pt/alumnos/nuevo`, entrenador)
- Página completa, con el ítem "Alumnos" activo en el sidebar y la topbar "Invitar alumno" / "ALUMNOS › NUEVO · GENERÁ QR Y COMPARTILO POR WHATSAPP". El botón "Generar QR" del sidebar lleva acá.
- **Columna izquierda, "DATOS DEL ALUMNO":**
  - **Obligatorios:** nombre y apellido; email; teléfono con código de país (`+54` precargado, al menos 8 dígitos).
  - **Opcionales:**
    - objetivo, un select con un primer ítem vacío ("Sin definir") y las opciones Tonificar (`tonify`), Bajar de peso (`weight_loss`), Ganar masa muscular (`hypertrophy`) y Ganar fuerza (`strength`);
    - nivel, un select con Sin definir, Principiante (`beginner`), Intermedio (`intermediate`) y Avanzado (`advanced`).
  - Botón primary "Generar QR".
  - Frecuencia, altura, peso, edad, plantilla inicial, equipamiento y lesiones quedan en la tarjeta deseable "Datos extra al invitar un alumno" (https://trello.com/c/NIiLFTcs).
- **Envío:** `POST /invitations` con `delivery_channel: 'both'` (siempre hay teléfono). Los opcionales vacíos no se mandan.
- **Columna derecha, "COMPARTIR QR":**
  - Antes de generar: estado vacío, "Completá los datos y generá el QR".
  - Después de generar, como el prototipo:
    - tarjeta con el QR de `join_url`, generado en el cliente con `qrcode.react` (4.2.0), con el logo de marca al centro;
    - "<Nombre>, abrí con la cámara";
    - "VÁLIDO 48H" (las horas restantes se calculan desde `expires_at`);
    - el link real, con un botón **Copiar link** que muestra "¡Copiado!" por 2 s;
    - botones **WhatsApp**, que abre `whatsapp_share_url` en una pestaña nueva, y **Descargar**, que baja `invitacion-<nombre>.png` desde el canvas.
  - "Generar otro" limpia el formulario.
- Debajo va la caja "QUÉ VE EL ALUMNO" con los 4 pasos del prototipo.
- Errores:
  - `STUDENT_EMAIL_EXISTS` → "Ya existe un alumno con ese email", en el campo email;
  - `VALIDATION_ERROR` → cada error en su campo (`student_name`, `student_email`, `student_phone`, `goal`, `level` se mapean a sus inputs);
  - sin red → mensaje general, y se puede reintentar.

### Alta del alumno desde la web (`/join?token=<uuid>`, pública)
- Lee `token` de la query. Si falta o no es un UUID → estado de error "El link de invitación no es válido".
- `GET /invitations/:token`. Mientras carga, skeleton. Si responde bien, muestra los datos precargados (nombre del entrenador, nombre y email del alumno, solo lectura) y pide la contraseña (8 caracteres o más, con su confirmación).
- `POST /students` con `{ token, password }`. El 201 trae `{ student, token, refresh_token }`: el store suma `joinFromInvitation()`, que guarda `user = { ...student, role: 'student' }`, y lleva a `/alumno/hoy`.
- Errores, con estado de error a pantalla completa y el mensaje del backend:
  - `INVITATION_NOT_FOUND` (404): "La invitación no existe";
  - `INVITATION_EXPIRED` y `INVITATION_ALREADY_USED` (410): mensaje del backend, más "Pedile una nueva a tu profe";
  - sin red: mensaje general con "Reintentar".
- Con sesión iniciada, `/join` también es solo para visitantes: redirige a la home del rol.

### Backend: objetivo opcional
- `POST /invitations`: `goal` pasa a ser opcional. Si falta o es `null`, se guarda `student_goal = null`; si viene, tiene que ser uno de los 4 valores. La base ya lo permite (`02-students.sql`).
- Tests de la validación y del service para los dos casos.
- Se actualiza `docs/arquitectura/contratos-api.md` (objetivo opcional, `level`, `gym_equipment` e `injuries` documentados), como pide la DoD.

### ADR
- `docs/adr/0002-sesion-web.md` documenta la decisión de sesión que ya implementó la #19:
  - el access token vive solo en memoria;
  - el refresh y el user van en `localStorage`;
  - hay renovación automática y la sesión se conserva si el servidor no responde.
- Explica por qué (el XSS frente a la persistencia) y deja la cookie HttpOnly como alternativa descartada por ahora, porque exigiría cambios de backend y de CORS.

## 3. Estructura (orientativa)
- `api/auth/auth.api.js` (+ `register`), `api/invitations/invitations.api.js` (`create`, `getByToken`), `api/students/students.api.js` (`joinFromInvitation`).
- `hooks/auth/useAuthStore.js` (+ `register` y `joinFromInvitation`, sin pasarse de 200 líneas: si hace falta, la persistencia de la sesión va a un archivo aparte en `hooks/auth/`).
- `pages/auth/RegisterPage.jsx`, `pages/invitations/NewStudentPage.jsx` (+ componentes en `components/invitations/`: formulario, panel del QR, "qué ve el alumno") y `pages/students/JoinPage.jsx`.
- Componente `Select` en `components/shared/ui/`.
- Rutas en `routes/`.

## 4. Verificación
- `npm run lint` y `npm test` en `frontend/` y `backend/`.
- Tests:
  - registro (éxito → sesión y redirect; email duplicado en su campo);
  - nuevo alumno (envío con `both` y sin opcionales vacíos; QR y link visibles; copiar; email duplicado);
  - `/join` (precarga; alta → `/alumno/hoy`; vencida, usada y no encontrada);
  - store (`register`, `joinFromInvitation`);
  - backend (`goal` opcional).
- **Manual en el navegador**, contra el backend real y Supabase dev. Crea datos de prueba con nombres claros:
  1. registrar `qa.card5.<fecha>@test.com`;
  2. llegar al dashboard;
  3. "Generar QR" con un alumno de prueba;
  4. ver el QR, descargarlo, copiar el link y abrir WhatsApp (se verifica la URL);
  5. abrir `/join` en otra pestaña sin sesión y dar de alta al alumno;
  6. entrar como ese alumno a `/alumno/hoy`;
  7. volver a abrir el mismo link: "ya fue utilizada";
  8. capturas a 1280 y 375 px.

## 5. Fuera de alcance
- Foto de perfil y datos extra: están en las tarjetas deseables.
- Listar, reenviar o revocar invitaciones (no existe el endpoint).
- Recuperar la contraseña.
- La configuración de la demo con un celular real (`FRONTEND_URL`/`JOIN_LINK_HOST` con la IP de la LAN): se anota en la PR.
