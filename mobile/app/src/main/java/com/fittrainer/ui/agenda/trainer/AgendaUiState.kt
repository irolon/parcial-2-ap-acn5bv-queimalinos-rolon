package com.fittrainer.ui.agenda.trainer

import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.agenda.AvailabilitySlot
import com.fittrainer.data.agenda.localDay
import com.fittrainer.data.agenda.weekDays
import java.time.Instant
import java.time.LocalDate

/** Qué se puede hacer con un turno: nada, avisar que ya pasó, confirmar o cancelar, o solo cancelar. */
enum class AppointmentActions { NONE, PAST, CONFIRM_OR_CANCEL, CANCEL }

/** Como la web: lo que ya pasó no se toca (el backend da 409 APPOINTMENT_PAST); un cancelado no se reabre. */
fun actionsFor(appointment: Appointment, now: Instant): AppointmentActions = when {
    !appointment.at.isAfter(now) -> AppointmentActions.PAST
    appointment.status == AppointmentStatus.PENDING -> AppointmentActions.CONFIRM_OR_CANCEL
    appointment.status == AppointmentStatus.CONFIRMED -> AppointmentActions.CANCEL
    else -> AppointmentActions.NONE
}

/** Un día de la lista. availability: null si la disponibilidad nunca se bajó (no se puede decir "Sin disponibilidad"). */
data class AgendaDay(
    val date: LocalDate,
    val isToday: Boolean,
    val availability: String?,
    val appointments: List<Appointment>,
)

/** Los 7 días de la semana, con sus turnos por hora y sin los cancelados salvo [showCancelled]. */
fun buildDays(
    weekStart: LocalDate,
    today: LocalDate,
    appointments: List<Appointment>,
    slots: List<AvailabilitySlot>?,
    showCancelled: Boolean,
): List<AgendaDay> {
    val visible = appointments.filter { showCancelled || it.status != AppointmentStatus.CANCELLED }.groupBy { localDay(it.at) }
    return weekDays(weekStart).map { day ->
        AgendaDay(
            date = day,
            isToday = day == today,
            availability = slots?.let { all -> availabilityLabel(all.filter { it.weekday == day.dayOfWeek.value }) },
            appointments = visible[day].orEmpty().sortedWith(compareBy({ it.at }, { it.id })),
        )
    }
}

/**
 * La hoja de un turno. appointment: la versión de Room si sigue ahí (un refresco la actualiza), si no la última
 * vista. confirmingCancel: se está pidiendo la confirmación de cancelar. error: el del último intento.
 */
data class AppointmentSheetState(
    val appointment: Appointment,
    val actions: AppointmentActions,
    val confirmingCancel: Boolean = false,
    val pending: Boolean = false,
    val error: String? = null,
)

/** Valor por defecto sin semana (LocalDate.EPOCH pide API 34). La ViewModel siempre pasa la real. */
private val NO_WEEK: LocalDate = LocalDate.of(1970, 1, 1)

/**
 * loaded: Room ya respondió por esta semana. everSynced: esta semana se bajó alguna vez (si no, no se puede
 * decir "Sin turnos"). failed: falló el último refresco de esta semana (con caché es un aviso suave; sin caché,
 * el error con Reintentar).
 */
data class AgendaUiState(
    val weekStart: LocalDate = NO_WEEK,
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val days: List<AgendaDay> = emptyList(),
    val showCancelled: Boolean = false,
    val offline: Boolean = false,
    val refreshing: Boolean = false,
    val failed: Boolean = false,
    val sheet: AppointmentSheetState? = null,
) {
    /** Sin caché de la semana: cargando mientras no falle ni falte la red. */
    val showLoading: Boolean get() = loaded && !everSynced && !offline && (!failed || refreshing)
    val showError: Boolean get() = loaded && !everSynced && !offline && failed && !refreshing
    val showNotLoaded: Boolean get() = loaded && !everSynced && offline
    val notice: String? get() = AGENDA_REFRESH_FAILED.takeIf { everSynced && failed && !offline }
}
