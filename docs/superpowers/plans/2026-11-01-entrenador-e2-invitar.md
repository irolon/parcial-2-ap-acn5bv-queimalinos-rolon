---
tags: [plan]
tarjeta: E2
---
# E2 · Invitar alumno — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** desde Alumnos, el entrenador completa un formulario, genera la invitación y la comparte por QR, WhatsApp o link.

**Architecture:** `InvitationRepository.create()` llama a `POST /invitations` (solo online, nada que cachear). `InviteViewModel` maneja el formulario → envío → resultado. La pantalla es una ruta nueva colgada de la pestaña Alumnos.

**Tech Stack:** Kotlin + Compose + Retrofit + Hilt (JUnit).

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e2-invitar-design.md`

## Global Constraints

- ≤ 200 líneas por archivo; capa → módulo → archivo.
- Reglas del contrato:
  - `student_name` 2-100;
  - email válido;
  - `goal` ∈ {tonify, weight_loss, hypertrophy, strength};
  - `level` ∈ {beginner, intermediate, advanced};
  - `gym_equipment` ≤ 30 ítems de 1-50;
  - `injuries` ≤ 1000;
  - `delivery_channel` = `both` con teléfono, `qr` sin teléfono.
- Invitar requiere red: sin conexión, el botón se deshabilita y aparece el aviso "Necesitás conexión para invitar".
- PR: "feat(mobile): invitar alumno desde el celular (tarjeta E2)", base `feature/android-entrenador-alumnos`.

## Review Focus

1. Doble toque en "Generar invitación" crea dos invitaciones → test del ViewModel en Task 2.
2. Rotar la pantalla o volver de WhatsApp pierde el QR → el estado vive en el ViewModel (`SavedStateHandle` para el formulario); verificarlo a mano en Task 3.
3. Teléfono con espacios o guiones → se manda recortado; el backend valida el formato → test del armado en Task 1.
4. Un 400 del servidor en un campo → se ve debajo de ese campo y no como un error genérico → test en Task 2.
5. Un `qr_base64` inválido o ausente → la pantalla muestra el link y los botones igual, sin crashear → test del decodificador en Task 1.

---

### Task 1: Datos — request, validación, decodificador y repositorio

> **Cambio al implementar (01/11):** `InvitationApi` va por el cliente sin Bearer (es pública), y `POST /invitations` necesita la sesión del entrenador. Por eso el POST está en una API aparte, `data/api/invitation/TrainerInvitationApi.kt` (cliente con Bearer), y en un repositorio aparte, `data/invitation/invite/InviteRepository.kt`, que devuelve `InviteResult` (`Created` / `Rejected` con los campos / `Failed`). El `InvitationRepository` del alumno queda igual. La base de la PR es la rama de E1 (`feature/android-entrenador-alumnos`, PR #52).

**Files:**
- Modify: `data/api/InvitationApi.kt` (`@POST("invitations") suspend fun create(@Body body: CreateInvitationRequest): CreatedInvitationResponse`), con DTOs en `data/api/InvitationApi.kt` o en un archivo `data/api/invitation/` nuevo si pasa de 200 líneas
- Create: `data/invitation/InviteForm.kt` (forma del formulario y validación pura), `data/invitation/QrImage.kt` (decodificador)
- Modify: `data/invitation/InvitationRepository.kt` (`suspend fun create(form: InviteForm): Result<CreatedInvitation>`)
- Test: `test/.../data/invitation/InviteFormTest.kt`, `QrImageTest.kt`, `InvitationRepositoryCreateTest.kt`

**Interfaces:**
- Produces:
  - `data class InviteForm(name, email, goal: String?, level: String?, phone: String, equipment: List<String>, injuries: String)`;
  - `fun InviteForm.errors(): Map<InviteField, String>` (vacío = válido);
  - `fun InviteForm.toRequest(): CreateInvitationRequest`;
  - `CreatedInvitation(joinUrl, qrPng: ByteArray?, whatsappUrl: String?, expiresAt: Instant)`;
  - `fun decodeDataUrl(dataUrl: String?): ByteArray?` (null si no es `data:image/png;base64,`).
  - La conversión a `ImageBitmap` va en la UI (`BitmapFactory`), así el test unitario no necesita Android.

- [ ] **Tests que fallan:**
  - nombre de 1 carácter → error;
  - email sin @ → error;
  - 31 ítems de equipamiento → error;
  - ítem de 51 caracteres → error;
  - lesiones de 1001 caracteres → error;
  - con teléfono → `both`; sin teléfono → `qr`;
  - goal y level vacíos → `null`;
  - recortes de espacios;
  - decodificador: data URL válida → bytes, basura → `null`;
  - repositorio: 201 → `CreatedInvitation`; 400 con `details[{field}]` → `DataException` con el campo; `IOException` → error de red.
- [ ] Implementar; tests → verde.

### Task 2: `InviteViewModel`

**Files:**
- Create: `ui/invitations/InviteViewModel.kt`, `ui/invitations/InviteUiState.kt`, `ui/invitations/InviteTexts.kt`
- Test: `test/.../ui/invitations/InviteViewModelTest.kt`

**Interfaces:**
- Produces:
  - `sealed InviteUiState`: `Editing(form, errors, showMore, sending, offline, serverError)` | `Done(invitation, studentName)`;
  - acciones: `onChange(field, value)`, `onAddEquipment(text)`, `onRemoveEquipment(i)`, `onToggleMore()`, `onSubmit()`, `onInviteAnother()`;
  - `expiryText(expiresAt, now)`: "VÁLIDO 48H" (horas que faltan, redondeadas hacia abajo);
  - `shareText(name, joinUrl)`.

- [ ] **Tests que fallan:**
  - submit con errores no llama al repositorio;
  - doble submit → una sola llamada;
  - offline → no envía;
  - éxito → `Done`;
  - 400 → `serverError` en el campo;
  - "Invitar a otro" → formulario vacío.
- [ ] Implementar; tests → verde.

### Task 3: Pantalla y navegación

**Files:**
- Create: `ui/invitations/InviteScreen.kt`, `ui/invitations/components/InviteFormFields.kt`, `ui/invitations/components/InviteResult.kt`
- Modify: `navigation/RoleTabs.kt` (`TRAINER_INVITE_ROUTE = "trainer/students/invite"`; la pestaña Alumnos sigue marcada en esa ruta, con `isTabSelected`), `navigation/RoleShell.kt` (composable de la ruta), `ui/students/StudentsScreen.kt` (botón "+" en la cabecera y "Invitar a tu primer alumno" en el estado vacío)

- [ ] **UI:**
  - campos con etiquetas mono en mayúscula;
  - `ExposedDropdownMenuBox` para objetivo y nivel;
  - "Más datos" plegable;
  - chips de equipamiento con "Agregar";
  - botón primario de 56 dp con indicador mientras envía.
- [ ] **Resultado:**
  - QR de 240 dp sobre una tarjeta clara;
  - textos;
  - "Enviar por WhatsApp" (`Intent.ACTION_VIEW` con `whatsappUrl`; si es null, `ACTION_SEND` con `shareText`);
  - "Compartir link" (`ACTION_SEND` con un chooser);
  - "Invitar a otro".
- [ ] `gradlew checkFileLength assembleDebug testDebugUnitTest` → verde.

### Task 4: E2E, auditoría y PR

- [ ] **E2E en el emulador** (backend local):
  - invitar a `invitado1.e2e@test.com` con teléfono, ver el QR y "VÁLIDO 47H/48H", tocar WhatsApp (sin WhatsApp: el selector) y "Compartir link";
  - después, sin teléfono: WhatsApp abre el selector;
  - cerrar sesión, "Tengo una invitación", pegar el link y dar de alta al alumno;
  - volver como `profe.card8`: aparece en la lista como "nuevo".
- [ ] Verificación completa; tarjeta E2 a auditoría.
- [ ] Con el ✅: commit, push y PR con base `feature/android-entrenador-alumnos` ("Apilada sobre la PR de E1"); tarjeta a ⏳ PENDIENTES.
