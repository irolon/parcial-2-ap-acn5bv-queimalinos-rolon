# E13 · Agenda del entrenador — plan

Spec: `docs/superpowers/specs/2026-11-05-entrenador-agenda-design.md`.
Worktree: `Desktop/fittrainer-entrenador-agenda`, rama `feature/android-entrenador-agenda` sobre `develop` `9470b4d`.

## Guía de estilo

- Copiar el estilo de E14: `data/challenges/trainer/`, `data/db/challenges/trainer/`, `ui/challenges/trainer/`, `navigation/trainer/TrainerChallengeRoutes.kt` y `di/challenges/`.
- Comentarios en español, con la misma densidad.
- ≤ 200 líneas por archivo y ≤ 10 archivos sueltos por carpeta.

## Tareas

1. **API.**
   - `data/api/agenda/AgendaDtos.kt` y `AgendaApi.kt`.
   - Registrar la API donde se registran las otras APIs autenticadas (ver cómo lo hace `TrainerChallengesApi` en `di/`).
2. **Room v23.**
   - Entidades y DAO en `data/db/agenda/`.
   - Hacer el reemplazo por semana con `@Transaction`: borrar `trainerId AND scheduledAt >= :from AND scheduledAt < :to`, hacer el upsert y escribir la fila de la semana.
   - Registrar las entidades y el DAO en `FitTrainerDatabase`: versión 23 y `AutoMigration(from = 22, to = 23)`.
   - Generar `schemas/.../23.json`.
3. **Dominio y fechas.**
   - En `data/agenda/`: `Appointment`, `AppointmentStatus`, `AvailabilitySlot`, el mapper y las utilidades de semana en Argentina (lunes, desplazamiento, `from` y `to`, límites en epoch ms).
   - Las etiquetas de UI van en `ui/agenda/trainer/AgendaTexts.kt`.
4. **Repositorio.**
   - `TrainerAgendaRepository` con un `Mutex` por entrenador.
   - Errores: `AppointmentConflictException` (409) y `AppointmentGoneException` (403, que además borra el turno del caché).
   - `UserDataCleaner` y el binding `@IntoSet` en `di/agenda/`.
5. **ViewModel.**
   - `AgendaViewModel` con:
     - `weekStart` en `MutableStateFlow`;
     - `showCancelled`;
     - el turno seleccionado;
     - el estado de la acción en curso (pendiente, error o confirmando la cancelación);
     - offline;
     - el error de carga.
   - El refresco va al entrar, al cambiar de semana, al volver la red y con pull-to-refresh, y nunca hay dos pedidos a la vez para la misma semana.
   - La semana y la disponibilidad se refrescan juntas.
6. **UI.**
   - `ui/agenda/trainer/`:
     - `AgendaScreen`;
     - `components/` con la tarjeta del día, la fila del turno, la leyenda y la barra de semana;
     - `AppointmentSheet` como `ModalBottomSheet`.
   - Usar el tema existente (`FtColors`, `Spacing`, tipografías) y `StatusViews` para cargando y error.
7. **Navegación y notificaciones.**
   - `navigation/trainer/TrainerAgendaRoutes.kt` y el `MenuLink("Agenda")`.
   - `NotificationType.APPOINTMENT` y `NotificationDestination.Agenda`.
   - `destinationOf` según el rol.
   - Manejar el destino en el resolvedor de navegación del entrenador, donde hoy se resuelven `StudentProfile` y `Conversation`. El alumno cae en `NotificationsList`.
   - Ícono y texto del ítem en la lista, si el ítem depende del tipo.
8. **Tests.**
   - Los unitarios y los instrumentados que lista el spec, con fakes en `test/.../testing/fakes/agenda/`.
   - Actualizar los tests existentes que enumeran tipos de notificación o los links de Más.
9. **Verificación.**
   - `gradlew checkFileLength assembleDebug testDebugUnitTest lintDebug compileDebugAndroidTestKotlin`.
   - Si hay emulador libre, `connectedDebugAndroidTest`.
   - Con `git status` revisar que no quede drift del esquema.
