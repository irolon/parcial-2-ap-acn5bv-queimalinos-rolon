package com.fittrainer.ui.agenda.student.request

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.agenda.student.AppointmentLimitException
import com.fittrainer.data.agenda.student.FreeSlotsCache
import com.fittrainer.data.agenda.student.NoTrainerException
import com.fittrainer.data.agenda.student.SlotTakenException
import com.fittrainer.data.agenda.student.SlotUnavailableException
import com.fittrainer.data.agenda.student.StudentAppointmentsRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.agenda.student.NOTE_MAX
import com.fittrainer.ui.agenda.student.NO_TRAINER
import com.fittrainer.ui.agenda.student.REQUEST_FAILED
import com.fittrainer.ui.agenda.student.REQUEST_OFFLINE
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.Instant
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

private data class Local(val refreshing: Boolean, val failed: Boolean, val noTrainer: Boolean, val sheet: RequestSheetState?, val requested: Boolean)

private data class SlotsRead(val loaded: Boolean, val cache: FreeSlotsCache?)

/**
 * «Pedir turno» (tarjeta 16): los horarios libres salen de Room (la última bajada) y se refrescan al entrar, al
 * volver la red y con pull-to-refresh. Solo se muestran los que dio el servidor. Pedir es solo con red.
 */
@HiltViewModel
class RequestAppointmentViewModel @Inject constructor(
    private val repository: StudentAppointmentsRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val studentId = sessionRepository.session.map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val refreshing = MutableStateFlow(false)
    private val failed = MutableStateFlow(false)
    private val noTrainer = MutableStateFlow(false)
    private val sheet = MutableStateFlow<RequestSheetState?>(null)
    private val requested = MutableStateFlow(false)

    /** La nota de la hoja. Un mutableStateOf y no parte del StateFlow: el TextField pierde letras si lee de un combine. */
    var note by mutableStateOf("")
        private set

    @OptIn(ExperimentalCoroutinesApi::class)
    private val slots = studentId.filterNotNull().flatMapLatest { id -> repository.observeFreeSlots(id).map { SlotsRead(true, it) } }
        .onStart { emit(SlotsRead(false, null)) }

    private val local = combine(refreshing, failed, noTrainer, sheet, requested, ::Local)

    val uiState: StateFlow<RequestUiState> = combine(slots, connectivity.isOnline, local) { s, on, l ->
        RequestUiState(
            loaded = s.loaded,
            everSynced = s.cache != null,
            days = buildSlotDays(s.cache?.slots.orEmpty(), clock.instant()),
            offline = !on,
            refreshing = l.refreshing,
            failed = l.failed,
            noTrainer = l.noTrainer,
            sheet = l.sheet,
            requested = l.requested,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RequestUiState())

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

    fun onSelectSlot(at: Instant) {
        if (sheet.value?.pending != true) sheet.value = RequestSheetState(at)
    }
    fun onDismissSheet() = sheet.update { if (it?.pending == true) it else null }

    /** Tope de 500 caracteres (el del backend). La nota se conserva si el horario no sale y se elige otro. */
    fun onNoteChange(text: String) {
        if (sheet.value?.pending != true) note = text.take(NOTE_MAX)
    }

    /** La pantalla ya volvió a «Mis turnos». */
    fun onRequestedHandled() {
        requested.value = false
    }

    fun onSubmit() {
        val s = sheet.value ?: return
        if (s.pending || s.closed) return
        if (!online.value) {
            sheet.value = s.copy(error = REQUEST_OFFLINE)
            return
        }
        sheet.value = s.copy(pending = true, error = null)
        viewModelScope.launch {
            repository.request(studentId.filterNotNull().first(), s.at, note)
                .onSuccess {
                    note = ""
                    sheet.value = null
                    requested.value = true
                }
                .onFailure { e ->
                    sheet.update { it?.let { cur -> failure(cur, e) } }
                    if (e is NoTrainerException) noTrainer.value = true
                    // Otro lo pidió en el medio o ya no está en la disponibilidad: se vuelven a bajar los libres.
                    if (e is SlotTakenException || e is SlotUnavailableException) refresh()
                }
        }
    }

    private fun refresh() {
        if (refreshing.value) return
        refreshing.value = true
        failed.value = false
        viewModelScope.launch {
            val error = repository.refreshFreeSlots(studentId.filterNotNull().first()).exceptionOrNull()
            noTrainer.value = error is NoTrainerException
            failed.value = error != null
            refreshing.value = false
        }
    }

    /** El error va en la hoja: el mensaje del backend para los rechazos del pedido, y el de sin red. */
    private fun failure(s: RequestSheetState, e: Throwable): RequestSheetState = when (e) {
        is SlotTakenException, is SlotUnavailableException, is AppointmentLimitException ->
            s.copy(pending = false, closed = true, error = e.message)
        is NoTrainerException -> s.copy(pending = false, closed = true, error = NO_TRAINER)
        else -> s.copy(pending = false, error = if ((e as? DataException)?.error == DataError.Offline) REQUEST_OFFLINE else REQUEST_FAILED)
    }
}
