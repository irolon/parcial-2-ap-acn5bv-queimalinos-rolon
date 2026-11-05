package com.fittrainer.ui.agenda.trainer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.agenda.AgendaWeekCache
import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentConflictException
import com.fittrainer.data.agenda.AppointmentGoneException
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.agenda.AvailabilityCache
import com.fittrainer.data.agenda.TrainerAgendaRepository
import com.fittrainer.data.agenda.localDay
import com.fittrainer.data.agenda.shiftWeek
import com.fittrainer.data.agenda.weekStartOf
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** La hoja abierta: el turno tal como se tocó y lo que pasa con la acción. gone: el servidor dijo que ya no existe. */
private data class SheetLocal(
    val appointment: Appointment,
    val confirmingCancel: Boolean = false,
    val pending: Boolean = false,
    val error: String? = null,
    val gone: Boolean = false,
)

private data class Local(val showCancelled: Boolean, val inFlight: Set<LocalDate>, val failed: Set<LocalDate>, val sheet: SheetLocal?)

private data class WeekRead(val weekStart: LocalDate, val loaded: Boolean, val cache: AgendaWeekCache?)

/**
 * Agenda del entrenador (E13): la semana y la disponibilidad salen de Room. Se refrescan juntas al entrar, al
 * cambiar de semana, al volver la red y con pull-to-refresh; nunca dos pedidos a la vez para la misma semana.
 * Confirmar y cancelar son solo con red.
 */
@HiltViewModel
class AgendaViewModel @Inject constructor(
    private val repository: TrainerAgendaRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val weekStart = MutableStateFlow(weekStartOf(clock.instant()))
    private val showCancelled = MutableStateFlow(false)
    private val inFlight = MutableStateFlow<Set<LocalDate>>(emptySet())
    private val failed = MutableStateFlow<Set<LocalDate>>(emptySet())
    private val sheet = MutableStateFlow<SheetLocal?>(null)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val week = combine(trainerId.filterNotNull(), weekStart, ::Pair).flatMapLatest { (id, start) ->
        repository.observeWeek(id, start).map { WeekRead(start, true, it) }.onStart { emit(WeekRead(start, false, null)) }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    private val availability = trainerId.filterNotNull().flatMapLatest { repository.observeAvailability(it) }
        .map<AvailabilityCache?, AvailabilityCache?> { it }.onStart { emit(null) }

    private val local = combine(showCancelled, inFlight, failed, sheet, ::Local)

    val uiState: StateFlow<AgendaUiState> = combine(week, availability, connectivity.isOnline, local) { w, a, on, l ->
        val now = clock.instant()
        val appointments = w.cache?.appointments.orEmpty()
        AgendaUiState(
            weekStart = w.weekStart,
            loaded = w.loaded,
            everSynced = w.cache != null,
            days = buildDays(w.weekStart, localDay(now), appointments, a?.slots, l.showCancelled),
            showCancelled = l.showCancelled,
            offline = !on,
            refreshing = w.weekStart in l.inFlight,
            failed = w.weekStart in l.failed,
            sheet = l.sheet?.let { s ->
                val current = appointments.firstOrNull { it.id == s.appointment.id } ?: s.appointment
                AppointmentSheetState(
                    current, if (s.gone) AppointmentActions.NONE else actionsFor(current, now), s.confirmingCancel, s.pending, s.error,
                )
            },
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AgendaUiState(weekStart = weekStart.value))

    init {
        // Volvió la red: se refresca la semana que se está mirando (drop(1): el estado inicial no es un cambio).
        viewModelScope.launch { online.drop(1).filter { it }.collect { refresh(weekStart.value) } }
    }

    fun onStart() = refresh(weekStart.value)
    fun onPullToRefresh() = refresh(weekStart.value)
    fun onRetry() = refresh(weekStart.value)
    fun onPrevWeek() = goTo(shiftWeek(weekStart.value, -1))
    fun onNextWeek() = goTo(shiftWeek(weekStart.value, 1))
    fun onThisWeek() = goTo(weekStartOf(clock.instant()))
    fun onToggleCancelled(show: Boolean) {
        showCancelled.value = show
    }
    fun onDismissNotice() = failed.update { it - weekStart.value }

    fun onSelect(appointment: Appointment) {
        if (sheet.value?.pending != true) sheet.value = SheetLocal(appointment)
    }
    fun onDismissSheet() = sheet.update { if (it?.pending == true) it else null }
    fun onAskCancel() = editSheet { it.copy(confirmingCancel = true, error = null) }
    fun onBackFromCancel() = editSheet { it.copy(confirmingCancel = false, error = null) }
    fun onConfirm() = change(AppointmentStatus.CONFIRMED)

    /** Solo después de "Cancelar turno": el sí de la confirmación. */
    fun onCancelConfirmed() {
        if (sheet.value?.confirmingCancel == true) change(AppointmentStatus.CANCELLED)
    }

    private fun goTo(start: LocalDate) {
        weekStart.value = start
        refresh(start)
    }

    private fun refresh(start: LocalDate) {
        if (start in inFlight.value) return
        inFlight.update { it + start }
        failed.update { it - start }
        viewModelScope.launch {
            val id = trainerId.filterNotNull().first()
            val error = coroutineScope {
                val w = async { repository.refreshWeek(id, start) }
                val a = async { repository.refreshAvailability(id) }
                w.await().exceptionOrNull() ?: a.await().exceptionOrNull()
            }
            if (error != null) failed.update { it + start }
            inFlight.update { it - start }
        }
    }

    private fun editSheet(change: (SheetLocal) -> SheetLocal) = sheet.update { s -> s?.takeIf { !it.pending && !it.gone }?.let(change) ?: s }

    private fun change(status: AppointmentStatus) {
        val s = sheet.value ?: return
        val shown = uiState.value.sheet?.appointment?.takeIf { it.id == s.appointment.id } ?: s.appointment
        if (s.pending || s.gone || !allowed(actionsFor(shown, clock.instant()), status)) return
        if (!online.value) {
            sheet.value = s.copy(error = ACTION_OFFLINE)
            return
        }
        sheet.value = s.copy(pending = true, error = null)
        viewModelScope.launch {
            repository.updateStatus(trainerId.filterNotNull().first(), shown.id, status)
                .onSuccess { sheet.value = null }
                .onFailure { e ->
                    sheet.update { it?.let { cur -> failure(cur, e) } }
                    // 409: el turno cambió o ya pasó; se refresca su semana, así la hoja muestra el estado nuevo.
                    if (e is AppointmentConflictException) refresh(weekStartOf(shown.at))
                }
        }
    }

    /** El error va en la hoja: el mensaje del backend en 409, "ya no existe" en 403 y el de sin red. */
    private fun failure(s: SheetLocal, e: Throwable): SheetLocal = when (e) {
        is AppointmentConflictException -> s.copy(pending = false, confirmingCancel = false, error = e.message)
        is AppointmentGoneException -> s.copy(pending = false, confirmingCancel = false, gone = true, error = APPOINTMENT_GONE)
        else -> s.copy(pending = false, error = if ((e as? DataException)?.error == DataError.Offline) ACTION_OFFLINE else ACTION_FAILED)
    }

    private fun allowed(actions: AppointmentActions, status: AppointmentStatus): Boolean = when (status) {
        AppointmentStatus.CONFIRMED -> actions == AppointmentActions.CONFIRM_OR_CANCEL
        AppointmentStatus.CANCELLED -> actions == AppointmentActions.CONFIRM_OR_CANCEL || actions == AppointmentActions.CANCEL
        AppointmentStatus.PENDING -> false
    }
}
