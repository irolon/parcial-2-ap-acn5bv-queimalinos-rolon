package com.fittrainer.ui.agenda.student.mine

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentConflictException
import com.fittrainer.data.agenda.AppointmentGoneException
import com.fittrainer.data.agenda.student.MyAppointmentsCache
import com.fittrainer.data.agenda.student.StudentAppointmentsRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.agenda.ACTION_FAILED
import com.fittrainer.ui.agenda.APPOINTMENT_GONE
import com.fittrainer.ui.agenda.student.REQUEST_OFFLINE
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
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

/** La clave del SavedStateHandle de «Mis turnos» con la que «Pedir turno» avisa que salió bien. */
const val APPOINTMENT_REQUESTED_KEY = "appointment_requested"

/** La hoja abierta: el turno tal como se tocó y lo que pasa con cancelar. gone: el servidor dijo que ya no existe. */
private data class SheetLocal(
    val appointment: Appointment,
    val confirmingCancel: Boolean = false,
    val pending: Boolean = false,
    val error: String? = null,
    val gone: Boolean = false,
)

private data class Local(val refreshing: Boolean, val failed: Boolean, val requested: Boolean, val sheet: SheetLocal?)

private data class MineRead(val loaded: Boolean, val cache: MyAppointmentsCache?)

/**
 * «Mis turnos» del alumno (tarjeta 16): salen de Room y se refrescan al entrar (también desde un push de turno), al
 * volver la red y con pull-to-refresh. Cancelar es solo con red y pide confirmación.
 */
@HiltViewModel
class MyAppointmentsViewModel @Inject constructor(
    private val repository: StudentAppointmentsRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
    private val savedState: SavedStateHandle,
) : ViewModel() {

    private val studentId = sessionRepository.session.map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val refreshing = MutableStateFlow(false)
    private val failed = MutableStateFlow(false)
    private val sheet = MutableStateFlow<SheetLocal?>(null)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val mine = studentId.filterNotNull().flatMapLatest { id -> repository.observeMine(id).map { MineRead(true, it) } }
        .onStart { emit(MineRead(false, null)) }

    private val local = combine(refreshing, failed, savedState.getStateFlow(APPOINTMENT_REQUESTED_KEY, false), sheet, ::Local)

    val uiState: StateFlow<MyAppointmentsUiState> = combine(mine, connectivity.isOnline, local) { m, on, l ->
        val now = clock.instant()
        val appointments = m.cache?.appointments.orEmpty()
        MyAppointmentsUiState(
            loaded = m.loaded,
            everSynced = m.cache != null,
            items = buildMyList(appointments, now),
            offline = !on,
            refreshing = l.refreshing,
            failed = l.failed,
            requested = l.requested,
            sheet = l.sheet?.let { s ->
                val current = appointments.firstOrNull { it.id == s.appointment.id } ?: s.appointment
                val actions = if (s.gone) MyAppointmentActions.NONE else myActionsFor(current, now)
                MyAppointmentSheetState(current, actions, s.confirmingCancel, s.pending, s.error)
            },
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MyAppointmentsUiState())

    init {
        // Volvió la red: se refresca (drop(1): el estado inicial no es un cambio).
        viewModelScope.launch { online.drop(1).filter { it }.collect { refresh() } }
    }

    fun onStart() = refresh()
    fun onPullToRefresh() = refresh()
    fun onRetry() = refresh()
    fun onDismissNotice() {
        failed.value = false
    }
    /** «Pedir turno» salió bien: lo avisa la ruta, que lo recibe en el SavedStateHandle de su entrada. */
    fun onRequested() {
        savedState[APPOINTMENT_REQUESTED_KEY] = true
    }
    fun onDismissRequested() {
        savedState[APPOINTMENT_REQUESTED_KEY] = false
    }

    /** Solo los que se pueden cancelar abren la hoja. */
    fun onSelect(appointment: Appointment) {
        if (sheet.value?.pending == true || myActionsFor(appointment, clock.instant()) != MyAppointmentActions.CANCEL) return
        sheet.value = SheetLocal(appointment)
    }
    fun onDismissSheet() = sheet.update { if (it?.pending == true) it else null }
    fun onAskCancel() = editSheet { it.copy(confirmingCancel = true, error = null) }
    fun onBackFromCancel() = editSheet { it.copy(confirmingCancel = false, error = null) }

    /** Solo después de "Cancelar turno": el sí de la confirmación. */
    fun onCancelConfirmed() {
        val s = sheet.value ?: return
        val shown = uiState.value.sheet?.appointment?.takeIf { it.id == s.appointment.id } ?: s.appointment
        if (!s.confirmingCancel || s.pending || s.gone || myActionsFor(shown, clock.instant()) != MyAppointmentActions.CANCEL) return
        if (!online.value) {
            sheet.value = s.copy(error = REQUEST_OFFLINE)
            return
        }
        sheet.value = s.copy(pending = true, error = null)
        viewModelScope.launch {
            repository.cancel(studentId.filterNotNull().first(), shown.id)
                .onSuccess { sheet.value = null }
                .onFailure { e ->
                    sheet.update { it?.let { cur -> failure(cur, e) } }
                    // 409: el turno cambió o ya pasó; se refresca, así la hoja muestra el estado nuevo.
                    if (e is AppointmentConflictException) refresh()
                }
        }
    }

    private fun refresh() {
        if (refreshing.value) return
        refreshing.value = true
        failed.value = false
        viewModelScope.launch {
            val result = repository.refreshMine(studentId.filterNotNull().first())
            failed.value = result.isFailure
            refreshing.value = false
        }
    }

    private fun editSheet(change: (SheetLocal) -> SheetLocal) = sheet.update { s -> s?.takeIf { !it.pending && !it.gone }?.let(change) ?: s }

    /** El error va en la hoja: el mensaje del backend en 409, "ya no existe" en 403 y el de sin red. */
    private fun failure(s: SheetLocal, e: Throwable): SheetLocal = when (e) {
        is AppointmentConflictException -> s.copy(pending = false, confirmingCancel = false, error = e.message)
        is AppointmentGoneException -> s.copy(pending = false, confirmingCancel = false, gone = true, error = APPOINTMENT_GONE)
        else -> s.copy(pending = false, error = if ((e as? DataException)?.error == DataError.Offline) REQUEST_OFFLINE else ACTION_FAILED)
    }
}
