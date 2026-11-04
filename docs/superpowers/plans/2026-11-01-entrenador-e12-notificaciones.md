---
tags: [plan]
tarjeta: E12
---
# E12 · Notificaciones del entrenador — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** abrir al entrenador el push y el centro de notificaciones de la tarjeta 17, con destinos a la sesión o a la ficha del alumno.

**Architecture:** no hay módulo nuevo. Se generaliza lo de la tarjeta 17: el dueño pasa a ser cualquier usuario logueado, el destino depende del tipo y del rol, y hay pasos de navegación para el shell del entrenador. La campana del Inicio (E7) abre la lista.

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e12-notificaciones-design.md`

## Global Constraints

- **Archivos:** ≤ 200 líneas físicas, tests incluidos. El orden es capa → módulo → archivo, y los tests copian el árbol.
- **El alumno no cambia:** sus tipos, destinos y navegación quedan iguales, y sus tests siguen en verde sin tocar lo que prueban.
- **Room no cambia (v20).** Backend: solo el aviso en el README.
- **PR:** "feat(mobile): notificaciones del entrenador: push y centro con destino a la sesión o la ficha (tarjeta E12)". Base `feature/android-entrenador-desafios`.

## Review Focus

1. Un push de `routine_modified` con la app cerrada abre Alumnos → ficha → sesión, y atrás vuelve a la ficha → test de `navSteps`.
2. `pr` del entrenador va a la sesión y `pr` del alumno sigue yendo al gráfico → test de `destinationOf` por rol.
3. Un destino de entrenador con la sesión de un alumno (o al revés) no navega → test del resolver.
4. Cerrar sesión como entrenador da de baja su token y entrar de nuevo lo registra → test de `PushTokenRegistry`.
5. Datos rotos (sin `student_id` o sin `session_id`) abren la lista, nunca crashean → test de `destinationOf`.

---

### Task 1: Tipos, destino y dueño

- **Modify:** `AppNotification.kt` (tipos), `NotificationDestination.kt` (destinos y rol), `data/session/Session.kt` (`userId`), `NotificationsRepository.checkOwner`, `FitTrainerMessagingService` y `PushTokenRegistry`.
- **Test:** `NotificationDestinationTest`, `NotificationMapperTest` y `PushTokenRegistryTest` (+ entrenador).

### Task 2: Resolución y navegación

- **Modify:** `LaunchResolver`, `NotificationLaunchViewModel`, `NotificationNavigation` (`navSteps`), `RoleShell` (efecto y ruta), `RoleTabs` (`TRAINER_NOTIFICATIONS_ROUTE` → Inicio) y `RoleNavigationBar` (`notificationsUnread`).
- **Test:** `LaunchResolverTest`, `NotificationNavStepsTest` y `NotificationLaunchViewModelTest` (+ entrenador).

### Task 3: UI

- **Modify:**
  - `NotificationsViewModel` y `NotificationBellViewModel` (dueño con `userId`, destino con el rol);
  - `NotificationTexts` y `NotificationItem` (tipos nuevos);
  - `HomeHeader` y `TrainerHomeScreen` (campana con no leídas y abrir la lista).
- **Delete:** `PendingTodaySheet`.
- **Test:** ViewModels con sesión de entrenador y `NotificationTextsTest`.

### Task 4: Verificación y E2E

- [x] Correr `gradlew checkFileLength assembleDebug testDebugUnitTest` y las migraciones instrumentadas 12-20 (el merge de develop rehízo los schemas).
- [x] Hacer el E2E del §5 del spec.
- [x] Sumar el aviso a Pablo en `backend/README.md`, anotar "Cómo quedó", pasar la tarjeta a 🔍 AUDITORÍA y comentar.
