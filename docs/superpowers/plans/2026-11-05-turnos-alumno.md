# Tarjeta 16 · Turnos del alumno — plan

Spec: `docs/superpowers/specs/2026-11-05-turnos-alumno-design.md`.
Worktree: `Desktop/fittrainer-turnos-alumno`, rama `feature/android-turnos-alumno` sobre `feature/android-entrenador-agenda` (`2985e3e`).

Base de estilo: lo de la E13 (`data/agenda/`, `data/db/agenda/`, `ui/agenda/trainer/`, `navigation/trainer/TrainerAgendaRoutes.kt`) y los links de Perfil del alumno. ≤ 200 líneas por archivo y ≤ 10 sueltos por carpeta: lo del alumno va en subcarpetas `student/`.

## Tareas

1. **API**
   - Sumar a `AgendaApi` y sus DTO:
     - `GET availability/free`;
     - `POST appointments`, con `notes` omitido si es null.
   - Hace falta `encodeDefaults = false`: revisar que esté así en la configuración de kotlinx.
2. **Room v24**
   - En `data/db/agenda/student/`: las entidades y el DAO del alumno.
   - El reemplazo por ventana y el de los horarios libres van en `@Transaction`.
   - En `FitTrainerDatabase`: la v24, `AutoMigration(23, 24)` y `24.json`.
3. **Repositorio**
   - `data/agenda/student/StudentAppointmentsRepository` con estas funciones:
     - `observeMine`, `observeFreeSlots`;
     - `refreshMine`, `refreshFreeSlots`;
     - `request(at, notes)`, `cancel(id)`.
   - Errores tipados para el POST.
   - Mutex, generación + `writeLock` y `UserDataCleaner` con el binding en `di/agenda/`.
4. **Fechas y textos**
   - Reusar `AgendaWeek` y `AgendaTexts`. Si hace falta compartirlos, mover lo común a `ui/agenda/` y ajustar los imports de la E13.
5. **ViewModels y UI**
   - En `ui/agenda/student/`:
     - `MyAppointmentsScreen` y su ViewModel, más la hoja para cancelar;
     - `RequestAppointmentScreen` y su ViewModel, más la hoja para pedir con la nota.
   - Usar los componentes y colores de la E13, `StatusViews` y pull-to-refresh como el resto de la app.
6. **Navegación**
   - Rutas del alumno y el `MenuLink("Mis turnos")` en Perfil.
   - `RoleTabs`: las rutas nuevas heredan Perfil.
   - `NotificationDestination.StudentAppointments`:
     - `destinationOf("appointment")`: el alumno y el push sin rol van a «Mis turnos», el PT a la Agenda;
     - sumar el destino en `LaunchResolver` y `NotificationNavigation`.
7. **Tests**
   - Unitarios e instrumentados (`MigrationV24Test` en `migration/v2x/` y el DAO), como dice el spec.
   - Actualizar los tests existentes que cambien.
8. **Verificación**
   - `gradlew checkFileLength assembleDebug testDebugUnitTest lintDebug compileDebugAndroidTestKotlin`.
   - Con `git status`, revisar que esté el `24.json` y que no haya otros cambios.
