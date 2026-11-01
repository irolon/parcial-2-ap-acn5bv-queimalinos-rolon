---
tags: [spec]
tarjeta: E2
---
# Spec — E2 · Invitar alumno por QR o WhatsApp (mobile)

- **Tarjeta:** [E2 del tablero del entrenador](https://trello.com/c/JNAn2KF3).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-invitar`, apilada sobre `feature/android-entrenador-alumnos` (E1).
- **Diseño:** prototipo `EM_QR`. Reglas de `AGENTS.md` y `CONTRIBUTING.md`.
- **Contrato:** `POST /invitations` (`docs/arquitectura/contratos-api.md`). El backend no se toca.

## 1. Objetivo

El entrenador invita a un alumno nuevo desde el celular y el alumno entra escaneando el QR con su app (tarjeta 6) o con el link.

**Criterio de aceptación:** el entrenador invita desde el celular, el alumno escanea el QR con su app (o abre el link) y queda dado de alta en la lista del entrenador.

## 2. Decisiones (debate del 01/11)

- **Formulario:** igual que la web, sin "frecuencia" (los días salen de la rutina que se asigna después).
  - **Visibles:** nombre y apellido (2-100), email, objetivo (Tonificar / Bajar peso / Hipertrofia / Fuerza, opcional) y nivel (Principiante / Intermedio / Avanzado, opcional).
  - **"Más datos" plegado:** teléfono (opcional; solo hace falta para WhatsApp), equipamiento (chips, hasta 30, de 1-50 caracteres) y lesiones (hasta 1000).
- **Canal:** con teléfono se manda `delivery_channel: "both"`; sin teléfono, `"qr"`.
- **Solo online:** invitar necesita red. Sin conexión, el botón "Generar invitación" queda deshabilitado con el aviso "Necesitás conexión para invitar". Un error de red al enviar muestra un aviso y conserva lo escrito.
- **Validación en el celular:** las mismas reglas del backend, para avisar antes de enviar. Un 400 del servidor muestra el mensaje del campo.

## 3. Pantallas

### 3.1 Entrada

En la lista de alumnos (E1), el botón "+" azul de la cabecera abre "Invitar alumno". Si el entrenador no tiene alumnos, el estado vacío de E1 suma el botón "Invitar a tu primer alumno".

### 3.2 Formulario (`trainer/students/invite`)

- Título "Invitar alumno", flecha atrás.
- Campos con etiquetas en mayúscula mono, como el prototipo. Objetivo y nivel son selectores.
- "Generar invitación" (botón primario, 56 dp), con un indicador mientras envía; no se puede tocar dos veces.

### 3.3 Resultado (misma pantalla, cambia de estado)

- QR grande en blanco sobre la tarjeta, decodificado de `qr_base64`.
- Debajo: "<Nombre> escanea y entra" y "VÁLIDO 48H · <link corto>" (el vencimiento sale de `expires_at`).
- **Botones:**
  - "Enviar por WhatsApp": abre `whatsapp_share_url` si existe. Sin teléfono, abre el selector de compartir con el texto de la invitación y `join_url`.
  - "Compartir link": selector de compartir con `join_url`.
  - "Invitar a otro": vuelve al formulario vacío.
- Volver atrás regresa a la lista. El alumno aparece en la lista recién cuando acepta (E1 refresca al entrar).

## 4. Datos

- `InvitationApi` ya existe para el alumno (`GET /invitations/:token`); suma `POST invitations`.
- `InvitationRepository` (`data/invitation/`) suma `create(request): Result<CreatedInvitation>`. No hay nada para cachear: la invitación se muestra una vez, y el PNG del QR vive en el estado del ViewModel.
- Decodificar el QR (`data:image/png;base64,…` → `ImageBitmap`) va en una función pura testeable.

## 5. Pruebas

- **Unit:**
  - validación del formulario: nombre corto, email inválido, equipamiento de más de 30 ítems o de más de 50 caracteres, lesiones de más de 1000;
  - armado del request: canal según el teléfono, opcionales en `null`, recorte de espacios;
  - repositorio: éxito, 400 con el campo, error de red;
  - ViewModel: doble toque, sin conexión, éxito → resultado, "Invitar a otro";
  - decodificador de QR.
- **E2E (emulador):** invitar a `invitado1.e2e@test.com` con teléfono y abrir WhatsApp (o ver el selector si no está instalado). Después, con la app del alumno en el mismo emulador (cerrar sesión), pegar el link en "Tengo una invitación", completar el alta y volver a entrar como `profe.card8`: el alumno aparece en la lista.

## 6. Fuera de alcance

Guardar el QR en la galería, reenviar o cancelar invitaciones (el backend no tiene esos endpoints).
