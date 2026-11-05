package com.fittrainer.ui.agenda.student.request

import com.fittrainer.data.agenda.localDay
import com.fittrainer.ui.agenda.student.FREE_SLOTS_REFRESH_FAILED
import java.time.Instant
import java.time.LocalDate

/** Un día con horarios libres, por hora. */
data class SlotDay(val date: LocalDate, val slots: List<Instant>)

/** Los horarios guardados que todavía no empezaron, agrupados por día de Argentina. */
fun buildSlotDays(slots: List<Instant>, now: Instant): List<SlotDay> =
    slots.filter { it.isAfter(now) }.sorted().groupBy { localDay(it) }.map { (day, times) -> SlotDay(day, times) }

/**
 * La hoja de pedir un horario. closed: el servidor dijo que ese horario (o el pedido) no va más —ocupado, fuera de
 * la disponibilidad, tope de pendientes o sin entrenador—, así que no se ofrece reintentar.
 */
data class RequestSheetState(
    val at: Instant,
    val pending: Boolean = false,
    val error: String? = null,
    val closed: Boolean = false,
)

/**
 * loaded: Room ya respondió. everSynced: los horarios se bajaron alguna vez. failed: falló el último refresco.
 * noTrainer: el servidor dio 403 (sin entrenador o de baja). requested: el pedido salió bien (se vuelve a «Mis turnos»).
 */
data class RequestUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val days: List<SlotDay> = emptyList(),
    val offline: Boolean = false,
    val refreshing: Boolean = false,
    val failed: Boolean = false,
    val noTrainer: Boolean = false,
    val sheet: RequestSheetState? = null,
    val requested: Boolean = false,
) {
    val showNoTrainer: Boolean get() = loaded && noTrainer
    val showLoading: Boolean get() = loaded && !noTrainer && !everSynced && !offline && (!failed || refreshing)
    val showError: Boolean get() = loaded && !noTrainer && !everSynced && !offline && failed && !refreshing
    val showNotLoaded: Boolean get() = loaded && !noTrainer && !everSynced && offline

    /** Sin entrenador el backend da [] (no un error): por eso el vacío habla de horarios y no de entrenador. */
    val showEmpty: Boolean get() = !noTrainer && everSynced && days.isEmpty()
    val notice: String? get() = FREE_SLOTS_REFRESH_FAILED.takeIf { everSynced && failed && !offline && !noTrainer }
}
