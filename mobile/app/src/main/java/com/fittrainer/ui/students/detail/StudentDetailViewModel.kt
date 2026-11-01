package com.fittrainer.ui.students.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.detail.StudentDetailCache
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.students.detail.activePatch
import com.fittrainer.data.students.detail.asListStudent
import com.fittrainer.data.students.status
import com.fittrainer.ui.students.syncedAgo
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
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

/** Arg de navegación de la ficha. */
const val STUDENT_ID_ARG = "studentId"

/** Ficha del alumno. Lee de Room; refresca al entrar. Baja y reactivación son online y sin estado optimista. */
@HiltViewModel
class StudentDetailViewModel @Inject constructor(
    private val repository: TrainerStudentDetailRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val trainerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(Local())

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = trainerId.filterNotNull()
        .flatMapLatest { repository.observe(it, studentId) }
        .map<StudentDetailCache?, Loaded> { Loaded(it) }
        .onStart { emit(Loaded(null, loaded = false)) }

    val uiState: StateFlow<StudentDetailUiState> =
        combine(cache, connectivity.isOnline, local) { c, online, l ->
            val now = clock.instant()
            val today = LocalDate.ofInstant(now, ARGENTINA)
            val detail = c.cache?.detail
            StudentDetailUiState(
                loaded = c.loaded,
                detail = detail,
                header = detail?.let { headerLine(it, today) }.orEmpty(),
                status = detail?.asListStudent()?.status(today),
                syncedLabel = c.cache?.let { syncedAgo(it.fetchedAt, now) },
                offline = !online,
                refreshing = l.refreshing,
                saving = l.saving,
                confirmDisable = l.confirmDisable,
                notice = l.notice,
                gone = l.gone,
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StudentDetailUiState())

    fun onStart() {
        if (local.value.refreshing) return
        viewModelScope.launch {
            val trainer = trainerId.filterNotNull().first()
            local.update { it.copy(refreshing = true) }
            val error = repository.refresh(trainer, studentId).exceptionOrNull()
            local.update { it.copy(refreshing = false, gone = it.gone || error.isNotFound()) }
        }
    }

    fun onDisable() {
        if (uiState.value.canAct) local.update { it.copy(confirmDisable = true) }
    }

    fun onCancelDisable() = local.update { it.copy(confirmDisable = false) }

    fun onConfirmDisable() {
        local.update { it.copy(confirmDisable = false) }
        setActive(false)
    }

    fun onReactivate() = setActive(true)

    fun dismissNotice() = local.update { it.copy(notice = null) }

    private fun setActive(active: Boolean) {
        if (!uiState.value.canAct) return
        local.update { it.copy(saving = true, notice = null) }
        viewModelScope.launch {
            val trainer = trainerId.filterNotNull().first()
            val error = repository.update(trainer, studentId, activePatch(active)).exceptionOrNull()
            local.update {
                it.copy(
                    saving = false,
                    gone = it.gone || error.isNotFound(),
                    notice = if (error != null && !error.isNotFound()) DETAIL_ACTION_FAILED else null,
                )
            }
        }
    }

    private fun Throwable?.isNotFound() = (this as? DataException)?.error == DataError.NotFound

    private data class Loaded(val cache: StudentDetailCache?, val loaded: Boolean = true)

    private data class Local(
        val refreshing: Boolean = false,
        val saving: Boolean = false,
        val confirmDisable: Boolean = false,
        val notice: String? = null,
        val gone: Boolean = false,
    )
}
