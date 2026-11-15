# Datos extra al invitar y frecuencia en la ficha · celular

Fecha: 15/11/2026. Sigue a la #123 (Pablo, mergeada 15/11), que agregó al backend y a la web los datos extra al invitar y `students.weekly_frequency`.
Rama `feature/android-invitar-extras` sobre develop `03e32de1`. Room: **v30 → v31**.

## Por qué

La web ya permite cargar frecuencia, altura, peso y fecha de nacimiento al invitar, y muestra y edita la frecuencia en la ficha. El celular del entrenador no, así que un PT que invita desde el celular pierde esos datos. Equipamiento y lesiones ya están en el celular desde la GX8 (sección "Más datos").

## Qué tiene que pasar

### 1. Invitar alumno
En la sección **"Más datos"** (lo decidió Igna el 15/11: el alta rápida sigue siendo nombre, email, objetivo y nivel), después de teléfono, equipamiento y lesiones:

| Campo | Control | Va a `POST /invitations` | Regla (la misma que el backend) |
|---|---|---|---|
| Frecuencia | selector "Sin definir" / 1 a 7 ("4 días / semana") | `weekly_frequency` (int) | 1–7 |
| Altura | texto numérico, acepta coma decimal | `height_cm` (número) | 50–250 cm |
| Peso | texto numérico, acepta coma decimal | `weight_kg` (número) | 20–300 kg |
| Fecha de nacimiento | `BirthDateField` (el de Editar datos: muestra la fecha, sin la edad, igual que ahí) | `birth_date` (YYYY-MM-DD) | real, desde 1900-01-01, no futura |

- **Vacíos:** no se mandan (`null`, omitido).
- **Errores de la API:** `details[].field` = `weekly_frequency` / `height_cm` / `weight_kg` / `birth_date` se muestran en su campo.
- **El texto del botón** "Más datos (teléfono, equipamiento, lesiones)" suma los nuevos.

### 2. Ficha del alumno
- **La tarjeta "DATOS"** suma la fila "Frecuencia: 4 días/semana" ("—" sin dato), después de Nacimiento.
  - **Decisión de Claude, cambia lo de la primera versión de esta spec:** en el celular, la cabecera ya muestra "4 D/SEM", pero son los días de la **rutina asignada**. Poner ahí también la frecuencia deseada dejaba dos "D/SEM" que se confunden. La web muestra solo la deseada.
- **`GET /students/:id`** ya trae `weekly_frequency`. Se guarda en la ficha de Room (columna nueva `weeklyFrequency INTEGER` nullable en `trainer_student_details`, `AutoMigration(30, 31)`, `31.json` y `MigrationV31Test`).

### 3. Editar datos del alumno
- **Selector "Frecuencia":** "Sin definir" / 1 a 7. Va en el PATCH como `weekly_frequency` solo si cambió, y vaciarlo manda `null`, que el backend acepta.

## Fuera de alcance
- Altura y peso en Editar datos: son medidas (`body_metrics`) y ya se cargan desde Medidas.
- Que el alumno edite su frecuencia: el backend no lo permite.
- Cambios de backend o de web.

## Criterio de aceptación
1. El PT invita desde el celular con los 4 datos nuevos. Al aceptar el alumno, la ficha muestra la frecuencia (DATOS) y la edad (cabecera), y Medidas muestra altura y peso como primera medida (eso lo hace el backend de la #123).
2. Los valores fuera de rango marcan su campo sin mandar nada.
3. La frecuencia se edita desde Editar datos y se ve en la tarjeta "DATOS" de la ficha.
4. `gradlew checkFileLength assembleDebug testDebugUnitTest` en verde, y `MigrationV31Test` en el **emulador** (nunca en el celular físico: `connectedAndroidTest` desinstala la app).
