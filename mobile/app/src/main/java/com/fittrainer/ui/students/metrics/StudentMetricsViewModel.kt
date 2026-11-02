package com.fittrainer.ui.students.metrics

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.students.metrics.MetricField
import com.fittrainer.data.students.metrics.MetricForm
import com.fittrainer.data.students.metrics.MetricsCache
import com.fittrainer.data.students.metrics.StudentMetric
import com.fittrainer.data.students.metrics.StudentMetricsRepository
import com.fittrainer.data.students.metrics.errors
import com.fittrainer.data.students.metrics.toRequest
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
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

const val OPEN_NEW_ARG = "new"

data class StudentMetricsUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val metrics: List<StudentMetric> = emptyList(),
    val offline: Boolean = false,
    val loadError: String? = null,
    val notice: String? = null,
    val sheet: MetricSheet? = null,
    val confirmDelete: StudentMetric? = null,
    val deleting: Boolean = false,
) {
    val canWrite: Boolean get() = !offline && !deleting
}

/** Historial de medidas (de Room) y alta y baja (online). Después de escribir, refresca la ficha (Última medición). */
@HiltViewModel
class StudentMetricsViewModel @Inject constructor(
    private val repository: StudentMetricsRepository,
    private val detailRepository: TrainerStudentDetailRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(Local(openNewOnLoad = saved.get<Boolean>(OPEN_NEW_ARG) == true))

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = trainerId.filterNotNull().flatMapLatest { repository.observe(it, studentId) }
        .map<MetricsCache, MetricsCache?> { it }.onStart { emit(null) }

    val uiState: StateFlow<StudentMetricsUiState> = combine(cache, connectivity.isOnline, local) { c, online, l ->
        StudentMetricsUiState(
            c != null, c?.fetchedAt != null, c?.metrics.orEmpty(), !online, l.loadError, l.notice, l.sheet, l.confirmDelete, l.deleting,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StudentMetricsUiState())

    fun today(): LocalDate = LocalDate.ofInstant(clock.instant(), ARGENTINA)

    fun onStart() {
        if (local.value.openNewOnLoad) {
            local.update { it.copy(openNewOnLoad = false) }
            onOpenNew()
        }
        viewModelScope.launch {
            val error = repository.refresh(trainer(), studentId).exceptionOrNull()
            val offline = (error as? DataException)?.error == DataError.Offline
            local.update { it.copy(loadError = if (error != null && !offline) METRICS_REFRESH_FAILED else null) }
        }
    }

    fun onRetry() = onStart()

    fun onOpenNew() {
        if (uiState.value.offline) return
        local.update { it.copy(sheet = MetricSheet(MetricForm(date = today()), UUID.randomUUID().toString())) }
    }

    /** Cerrar con un intento incierto rebaja el historial: si se había guardado, aparece. */
    fun onCloseSheet() {
        val sheet = local.value.sheet ?: return
        if (sheet.saving) return
        local.update { it.copy(sheet = null) }
        if (sheet.pending != null) viewModelScope.launch { repository.refresh(trainer(), studentId) }
    }

    /** Con un intento pendiente no se edita: se reintenta igual o se cierra la hoja. */
    fun onFormChange(change: (MetricForm) -> MetricForm) = local.update { l ->
        val sheet = l.sheet ?: return@update l
        if (sheet.pending != null || sheet.saving) l else l.copy(sheet = sheet.copy(form = change(sheet.form), errors = emptyMap(), notice = null))
    }

    /** Doble toque: el segundo no hace nada mientras se guarda; y un reintento usa el mismo id (no duplica). */
    fun onSave() {
        val sheet = local.value.sheet ?: return
        if (sheet.saving || uiState.value.offline) return
        val request = sheet.pending ?: run {
            val errors = sheet.form.errors(today())
            if (errors.isNotEmpty()) {
                local.update { it.copy(sheet = sheet.copy(errors = errors)) }
                return
            }
            sheet.form.toRequest(sheet.attemptId, today(), OffsetDateTime.now(clock.withZone(ARGENTINA)).toString())
        }
        local.update { it.copy(sheet = sheet.copy(saving = true, notice = null)) }
        viewModelScope.launch {
            val error = repository.add(trainer(), studentId, request).exceptionOrNull()
            local.update {
                if (error == null) it.copy(sheet = null, notice = METRIC_SAVED)
                else it.copy(sheet = it.sheet?.copy(saving = false, pending = stillPending(sheet, request, error), notice = failNotice(sheet, error)))
            }
            if (error == null) refreshDetail()
        }
    }

    fun onAskDelete(metric: StudentMetric) {
        if (uiState.value.canWrite) local.update { it.copy(confirmDelete = metric) }
    }

    fun onCancelDelete() = local.update { it.copy(confirmDelete = null) }

    fun onConfirmDelete() {
        val metric = local.value.confirmDelete ?: return
        local.update { it.copy(confirmDelete = null, deleting = true, notice = null) }
        viewModelScope.launch {
            val error = repository.delete(trainer(), studentId, metric.id).exceptionOrNull()
            local.update { it.copy(deleting = false, notice = if (error == null) METRIC_DELETED else METRIC_DELETE_FAILED) }
            if (error == null) refreshDetail()
        }
    }

    fun dismissNotice() = local.update { it.copy(notice = null) }

    /** La "Última medición" de la ficha cambia sin salir y volver a entrar. */
    private fun refreshDetail() {
        viewModelScope.launch { detailRepository.refresh(trainer(), studentId) }
    }

    private suspend fun trainer(): String = trainerId.filterNotNull().first()

    private data class Local(
        val openNewOnLoad: Boolean = false,
        val loadError: String? = null,
        val notice: String? = null,
        val sheet: MetricSheet? = null,
        val confirmDelete: StudentMetric? = null,
        val deleting: Boolean = false,
    )
}
