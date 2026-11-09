package com.fittrainer.ui.agenda.student.mine

import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.ui.agenda.student.MY_APPOINTMENTS_REFRESH_FAILED
import java.time.Instant

/** Qué puede hacer el alumno con un turno suyo: nada (cancelado), avisar que ya pasó, o cancelarlo. */
enum class MyAppointmentActions { NONE, PAST, CANCEL }

/** El alumno nunca confirma; cancela lo pendiente o confirmado que no pasó (el backend da 409 APPOINTMENT_PAST). */
fun myActionsFor(appointment: Appointment, now: Instant): MyAppointmentActions = when {
    appointment.status == AppointmentStatus.CANCELLED -> MyAppointmentActions.NONE
    !appointment.at.isAfter(now) -> MyAppointmentActions.PAST
    else -> MyAppointmentActions.CANCEL
}

/** Una fila de «Mis turnos». */
data class MyAppointmentItem(val appointment: Appointment, val actions: MyAppointmentActions)

/** Por fecha; los cancelados al final (atenuados en la pantalla): el alumno tiene pocos turnos, no hace falta un toggle. */
fun buildMyList(appointments: List<Appointment>, now: Instant): List<MyAppointmentItem> {
    val byTime = compareBy<Appointment>({ it.at }, { it.id })
    val (cancelled, active) = appointments.partition { it.status == AppointmentStatus.CANCELLED }
    return (active.sortedWith(byTime) + cancelled.sortedWith(byTime)).map { MyAppointmentItem(it, myActionsFor(it, now)) }
}

/** La hoja de un turno propio. appointment: la versión de Room si sigue ahí, si no la última vista. */
data class MyAppointmentSheetState(
    val appointment: Appointment,
    val actions: MyAppointmentActions,
    val confirmingCancel: Boolean = false,
    val pending: Boolean = false,
    val error: String? = null,
)

/**
 * loaded: Room ya respondió. everSynced: los turnos se bajaron alguna vez (si no, no se puede decir "No tenés
 * turnos"). failed: falló el último refresco. requested: se vuelve de pedir un turno (el aviso de arriba).
 */
data class MyAppointmentsUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val items: List<MyAppointmentItem> = emptyList(),
    val offline: Boolean = false,
    val refreshing: Boolean = false,
    val failed: Boolean = false,
    val requested: Boolean = false,
    val sheet: MyAppointmentSheetState? = null,
) {
    val showLoading: Boolean get() = loaded && !everSynced && !offline && (!failed || refreshing)
    val showError: Boolean get() = loaded && !everSynced && !offline && failed && !refreshing
    val showNotLoaded: Boolean get() = loaded && !everSynced && offline
    val showEmpty: Boolean get() = everSynced && items.isEmpty()
    val notice: String? get() = MY_APPOINTMENTS_REFRESH_FAILED.takeIf { everSynced && failed && !offline }
}
