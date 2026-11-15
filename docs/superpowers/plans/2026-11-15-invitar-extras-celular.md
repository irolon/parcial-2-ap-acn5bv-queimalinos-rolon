# Datos extra al invitar y frecuencia en la ficha · celular · plan

**Spec:** `docs/superpowers/specs/2026-11-15-invitar-extras-celular-design.md`

Rutas bajo `mobile/app/src/main/java/com/fittrainer/` y `mobile/app/src/test/java/com/fittrainer/`. Ningún archivo pasa de 200 líneas. No se commitea hasta el OK de Igna.

## Tarea 1: invitar (modelo y request)
- `data/api/invitation/TrainerInvitationApi.kt`, `CreateInvitationRequest`, campos nuevos, todos con default null:
  - `@SerialName("weekly_frequency") val weeklyFrequency: Int?`
  - `@SerialName("height_cm") val heightCm: Double?`
  - `@SerialName("weight_kg") val weightKg: Double?`
  - `@SerialName("birth_date") val birthDate: String?`
- `data/invitation/invite/InviteForm.kt`:
  - `InviteField` suma `FREQUENCY`, `HEIGHT`, `WEIGHT`, `BIRTH_DATE`;
  - `InviteForm` suma `weeklyFrequency: Int? = null`, `height: String = ""`, `weight: String = ""` y `birthDate: LocalDate? = null`.
  - `errors(today: LocalDate)` (hoy no recibe fecha: agregar el parámetro y pasarlo desde el ViewModel con su `Clock`):
    - altura y peso se parsean con coma o punto; un texto que no es número o está fuera de rango → "Entre 50 y 250 cm" / "Entre 20 y 300 kg";
    - fecha futura → "No puede ser una fecha futura"; anterior a 1900 → "Desde 1900".
  - `toRequest()` manda los números parseados y la fecha `toString()`; los vacíos van null.
  - `inviteFieldOf` mapea los 4 campos de la API.
  - Si el archivo pasa de 200, separar el parseo de números en `data/invitation/invite/InviteNumbers.kt`.
- **Tests** en `data/invitation/invite/InviteFormTest.kt` (o el test existente del formulario):
  - `extrasGoInRequest` (178 / "74,5" / 4 / 2002-03-15 → 178.0, 74.5, 4, "2002-03-15");
  - `emptyExtrasAreNull`;
  - `outOfRangeHeightAndWeight` (49, 251, "abc", 19, 301);
  - `birthDateFutureAndBefore1900`;
  - `apiFieldsMap`.

## Tarea 2: invitar (pantalla)
- `ui/invitations/components/InviteFormFields.kt`: dentro de `if (state.showMore)`, después de lesiones:
  - `OptionPicker("FRECUENCIA", …)` con 1 a 7, etiqueta "N día(s) / semana" y "Sin definir";
  - dos `LabeledField` con `KeyboardType.Decimal` ("ALTURA (CM)" y "PESO (KG)");
  - `BirthDateField` (de `ui/students/edit/`) con la edad.

  El botón dice "Más datos (teléfono, equipamiento, lesiones, frecuencia, medidas y nacimiento)" o algo equivalente más corto.
- `InviteViewModel`: los cambios pasan por el `onChange` existente o por uno nuevo tipado para frecuencia y fecha. Ya tiene 158 líneas: si pasa de 200, extraer lo nuevo a `ui/invitations/InviteExtras.kt`.
- **Test** en `ui/invitations/InviteViewModelTest.kt`: `sendsExtras` (el request del fake lleva los 4 campos).

## Tarea 3: ficha y edición (Room v31)
- `StudentDetailDtos.kt` suma `@SerialName("weekly_frequency") val weeklyFrequency: Int? = null`.
- La frecuencia se copia a `TrainerStudentDetailEntity` (`val weeklyFrequency: Int? = null`), a `StudentDetail` (`val weeklyFrequency: Int? = null`) y al mapper.
- `FitTrainerDatabase` pasa a `version = 31` con `AutoMigration(from = 30, to = 31)`, más `31.json` y `androidTest/.../migration/v3x/MigrationV31Test.kt` (como `MigrationV30Test`).
- `ui/students/detail/components/DetailCards.kt`: la fila "Frecuencia" en DATOS con `frequencyLine(...)` de `ui/components/FrequencyLabel.kt` (decisión en la spec: la cabecera no cambia).
- `data/students/detail/StudentPatch.kt`:
  - `EditField.FREQUENCY` y `EditableStudent.weeklyFrequency: Int?`;
  - `toEditable`, regla 1–7 y `diffPatch` (`weekly_frequency`, `null` si se vació);
  - `editFieldOf("weekly_frequency")`.
- `ui/students/edit/EditStudentScreen.kt`: `OptionPicker("FRECUENCIA", …, allowNone = true)` después de la fecha.
- **Tests:**
  - `TrainerStudentDetailRepositoryTest.detailKeepsWeeklyFrequency`;
  - `StudentPatchTest` (o el existente): `frequencyChangedGoesInPatch`, `frequencyClearedSendsNull`, `frequencyUnchangedNotSent`;
  - `FrequencyLabelTest`: opciones del selector y línea de la ficha ("4 días/semana", "1 día/semana", null sin dato);
  - `MigrationV31Test`.

## Verificación
- `cd mobile && ./gradlew checkFileLength assembleDebug testDebugUnitTest` → BUILD SUCCESSFUL.
- `MigrationV31Test` en el emulador, fijando el dispositivo:
  - levantar `emulator -avd Medium_Phone_API_36.0 -no-window`;
  - `ANDROID_SERIAL=emulator-5554 ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=…MigrationV31Test`;
  - **nunca sin `ANDROID_SERIAL`**, porque el S10 está conectado por Wi-Fi.
