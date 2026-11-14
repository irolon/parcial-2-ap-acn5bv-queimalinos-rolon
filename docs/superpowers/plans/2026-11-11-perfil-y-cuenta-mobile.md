# Perfil y Más (celular) — plan

**Spec:** `docs/superpowers/specs/2026-11-11-perfil-y-cuenta-mobile-design.md`.

**Rama:** `feature/android-perfil-y-mas`, apilada sobre la #113 (`feature/android-logros-alumno`, Room v28). El backend
de la #94 y la #95 ya está en develop y en esta base.

## Restricciones

- Ningún archivo de código pasa de 200 líneas. Orden capa → módulo → archivo.
- Room es la fuente de verdad. Room sube de 28 a 29 con `AutoMigration(28, 29)`, que solo crea la tabla `my_profile`.
- Las escrituras del perfil y la contraseña van solo con red: no se encolan.
- Cada pedido lleva `@Tag RequiredUser(owner)`.

## Tareas

### 1. API y DTOs: `data/api/account/`

- `ProfileApi`:
  - `studentMe(owner, id)`: `GET students/{id}`.
  - `updateStudent(owner, id, JsonObject)`: `PATCH students/{id}`.
  - `setAvatar(owner, id, Part)`: `PUT students/{id}/avatar`, multipart con el campo `image`.
  - `removeAvatar(owner, id)`: `DELETE students/{id}/avatar`, devuelve `Response<Unit>`.
  - `trainerMe(owner)`: `GET auth/me`.
  - `updateTrainer(owner, JsonObject)`: `PATCH auth/me`.
  - `changePassword(owner, ChangePasswordRequest)`: `PUT auth/password`.
- DTOs:
  - `{ data: ProfileDto }` con `id`, `name`, `email`, `phone?`, `avatar_url?` y `professional_title?`;
  - `AvatarResponse` con `{ data: { avatar_url } }`;
  - `ChangePasswordResponse` con `token`, `expires_in` y `password_changed_at`.
- `NetworkModule` lo provee.

### 2. Room: `data/db/account/`

- `MyProfileEntity`:
  - campos `ownerId` (PK), `role`, `name`, `email`, `phone?`, `avatarUrl?`, `professionalTitle?`, `fetchedAt`;
  - tabla `my_profile`.
- `MyProfileDao`: `observe(ownerId)`, `upsert`, `clearOwner`, `clear`.
- DB v29 con `AutoMigration(28, 29)` (exporta `29.json`) y `di/account/ProfileModule`.
- Test `MigrationV29Test` (`androidTest/.../data/db/migration/v2x/`).

### 3. Sesión

- `TokenStore.updateUserName(sessionId, name)`, en la implementación real (DataStore) y en el fake.
- Test en `DataStoreTokenStoreTest`, o en el que ya cubre `updateAccessToken`.

### 4. Reglas: `data/account/ProfileRules.kt`

- `nameError` (2 a 100).
- `phoneError`: vacío está bien; si no, el formato de la #95.
- `titleError`: vacío está bien; si no, 2 a 80.
- `newPasswordError`: al menos 8, una mayúscula, un número, distinta de la actual.
- `repeatError`.
- Test unitario de cada regla.

### 5. Repositorio: `data/account/ProfileRepository.kt` (+ `ProfileErrors.kt`)

- `observe(ownerId)`: `Flow<MyProfile?>`.
- `refresh(session)`: elige el endpoint según el rol.
- `updateStudent` y `updateTrainer`:
  - el body lleva solo lo que cambió;
  - vacío viaja como `null`;
  - guarda en Room y, si cambió el nombre, `updateUserName`.
- `setAvatar(owner, bytes)` y `removeAvatar(owner)`.
- `changePassword(current, new)`:
  - lee la sesión, que da el refresh token;
  - lee el push token, con un tope de 2 s;
  - si sale bien, `updateAccessToken`.
- Errores:
  - 400 con `details` → `FieldErrorsException(map)`;
  - 413 y 415 → `PhotoRejectedException`;
  - el resto, `DataException`.
- Guarda contra cerrar sesión (generación y lock, como en turnos) y es un `UserDataCleaner`.
- `ProfileModule` con `@IntoSet` y el `AvatarReader`: `PhotoCompressor` con máximo de 512.
- Tests con fakes de la API, el DAO y el `TokenStore`.

### 6. Pantalla de cuenta: `ui/account/`

- Reemplaza a `ui/placeholder/AccountMenuScreen`.
- `AccountViewModel`: lee de Room y refresca al entrar y al volver la red.
- `AccountScreen`:
  - `LazyColumn` con `ProfileCard`, las secciones y Cerrar sesión;
  - `ProfileAvatar` con Coil y las iniciales de fallback;
  - el aviso "Contraseña actualizada" llega por `SavedStateHandle`.
- Secciones:
  - alumno: "Mi entrenamiento" (los links de hoy);
  - entrenador: "Herramientas";
  - los dos: "Cuenta" (Cambiar contraseña, Notificaciones, Estado del servidor).
- "Entrena con": `counterpartName` del hilo del alumno en Room. Si no está, no se muestra.
- Tests:
  - ViewModel;
  - instrumentado de la tarjeta;
  - instrumentado en 320 × 560 dp con letra 1,1: se llega con scroll a Cerrar sesión.

### 7. Editar perfil: `ui/account/edit/`

- `EditProfileViewModel`:
  - parte del perfil de Room;
  - errores por campo, locales y del 400;
  - Guardar deshabilitado si no hay cambios o no hay red;
  - foto: cambiar o quitar, con su error;
  - al guardar, vuelve atrás.
- `EditProfileScreen`: foto solo para el alumno; campos según el rol.
- Tests: ViewModel e instrumentado del error de campo.

### 8. Cambiar contraseña: `ui/account/password/`

- ViewModel y pantalla con los tres campos.
- Ojo para mostrar la clave.
- Al terminar: `SavedStateHandle` de la entrada anterior → aviso.
- Tests del ViewModel.

### 9. Navegación

- Rutas:
  - `student/profile/edit` y `student/profile/password`;
  - `trainer/more/edit` y `trainer/more/password`.
- `parentTab`: suma `trainer/more/…` a Más.
- `navigation/account/AccountRoutes.kt`.
- `TabScreen` usa `AccountScreen`.

### 10. Cierre

- `gradlew checkFileLength assembleDebug testDebugUnitTest assembleDebugAndroidTest` (hecho el 13/11, en verde).
- Instrumentados en el S10.
- Prueba a mano en el S10 contra el backend de develop (la #94 y la #95 ya están mergeadas).
- Auditoría de Codex.
