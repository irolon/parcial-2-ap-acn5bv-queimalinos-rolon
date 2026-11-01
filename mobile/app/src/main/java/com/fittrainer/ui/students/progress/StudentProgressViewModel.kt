package com.fittrainer.ui.students.progress

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.progress.MonthProgress
import com.fittrainer.data.students.progress.StudentProgressRepository
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.YearMonth
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** loaded: Room ya respondió para el mes elegido. progress == null con loaded: ese mes nunca se bajó. */
data class StudentProgressUiState(
    val month: YearMonth,
    val current: YearMonth,
    val loaded: Boolean = false,
    val progress: MonthProgress? = null,
    val offline: Boolean = false,
    val refreshing: Boolean = false,
    val loadError: String? = null,
) {
    val canGoNext: Boolean get() = month < current
    val canGoPrevious: Boolean get() = month > FIRST_MONTH
}

/** El backend no acepta meses anteriores (no hay datos de la app antes). */
val FIRST_MONTH: YearMonth = YearMonth.of(2020, 1)

/** Resumen del mes y asistencia de un alumno, con navegación entre meses (nunca después del actual). */
@HiltViewModel
class StudentProgressViewModel @Inject constructor(
    private val repository: StudentProgressRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    // Se recalcula al volver a la pantalla: el ViewModel puede sobrevivir al cambio de mes.
    private val current = MutableStateFlow(nowMonth())
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val month = MutableStateFlow(current.value)
    private val local = MutableStateFlow(Local())
    private var refreshJob: Job? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = combine(trainerId.filterNotNull(), month) { t, m -> t to m }
        .flatMapLatest { (t, m) -> repository.observeMonth(t, studentId, m).map { m to Loaded(it) }.onStart { emit(m to Loaded(null, false)) } }

    val uiState: StateFlow<StudentProgressUiState> = combine(cache, current, connectivity.isOnline, local) { (m, c), cur, online, l ->
        StudentProgressUiState(m, cur, c.loaded, c.progress, !online, l.refreshing, l.loadError)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StudentProgressUiState(current.value, current.value))

    /** Al volver a la pantalla: si cambió el mes y se estaba mirando el que era el actual, se pasa al nuevo. */
    fun onStart() {
        val now = nowMonth()
        if (now != current.value) {
            if (month.value == current.value) month.value = now
            current.value = now
        }
        refresh()
    }

    fun onRetry() = refresh()

    fun onPreviousMonth() {
        if (month.value > FIRST_MONTH) go(month.value.minusMonths(1))
    }

    fun onNextMonth() {
        if (month.value < current.value) go(month.value.plusMonths(1))
    }

    private fun nowMonth(): YearMonth = YearMonth.from(clock.instant().atZone(ARGENTINA))

    private fun go(target: YearMonth) {
        month.value = target
        refresh()
    }

    /** Sin red no es un error: se ve lo cacheado (o "Conectate"). Otro error ofrece reintentar. */
    private fun refresh() {
        refreshJob?.cancel()
        val target = month.value
        refreshJob = viewModelScope.launch {
            local.update { it.copy(refreshing = true, loadError = null) }
            val error = repository.refreshMonth(trainerId.filterNotNull().first(), studentId, target).exceptionOrNull()
            val offline = (error as? DataException)?.error == DataError.Offline
            local.update { it.copy(refreshing = false, loadError = if (error != null && !offline) PROGRESS_REFRESH_FAILED else null) }
        }
    }

    private data class Loaded(val progress: MonthProgress?, val loaded: Boolean = true)

    private data class Local(val refreshing: Boolean = false, val loadError: String? = null)
}
