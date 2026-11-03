package com.fittrainer.ui.challenges.trainer.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.challenges.trainer.Challenge
import com.fittrainer.data.challenges.trainer.ChallengeGoneException
import com.fittrainer.data.challenges.trainer.TrainerChallengesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.StudentsCache
import com.fittrainer.data.students.TrainerStudent
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.ui.challenges.trainer.ASSIGN_FAILED
import com.fittrainer.ui.challenges.trainer.MAX_BATCH
import com.fittrainer.ui.challenges.trainer.NEEDS_NETWORK
import com.fittrainer.ui.challenges.trainer.batchSummary
import dagger.hilt.android.lifecycle.HiltViewModel
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

const val CHALLENGE_ID_ARG = "challengeId"

/** La hoja de "Asignar a alumnos": los elegidos y el error del último intento. */
/** La lista de alumnos de la hoja: todavía no se bajó nunca (LOADING o FAILED) o está lista. */
enum class StudentsLoad { LOADING, READY, FAILED }

data class PickState(val selected: Set<String> = emptySet(), val submitting: Boolean = false, val error: String? = null)

/**
 * gone: la lista se bajó y el desafío ya no está (o el POST dio 404). students: los activos, por nombre.
 * studentsLoad: sin caché de alumnos, si todavía se están bajando o si falló (así "no hay activos" solo
 * se dice cuando la lista se bajó de verdad).
 * notice: el resumen de la última asignación.
 */
data class ChallengeDetailUiState(
    val loaded: Boolean = false,
    val challenge: Challenge? = null,
    val gone: Boolean = false,
    val offline: Boolean = false,
    val students: List<TrainerStudent> = emptyList(),
    val studentsLoad: StudentsLoad = StudentsLoad.LOADING,
    val pick: PickState? = null,
    val notice: String? = null,
)

/** Detalle de un desafío (E14) y su asignación a varios alumnos en un solo POST. */
@HiltViewModel
class ChallengeDetailViewModel @Inject constructor(
    private val repository: TrainerChallengesRepository,
    private val studentsRepository: TrainerStudentsRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
) : ViewModel() {

    private val challengeId: String = checkNotNull(saved[CHALLENGE_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val pick = MutableStateFlow<PickState?>(null)
    private val notice = MutableStateFlow<String?>(null)
    private val goneByPost = MutableStateFlow(false)
    private val studentsFailed = MutableStateFlow(false)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val catalog = trainerId.filterNotNull().flatMapLatest { repository.observeCatalog(it) }
        .map { cache -> Catalog(true, cache != null, cache?.challenges?.firstOrNull { it.id == challengeId }) }
        .onStart { emit(Catalog(false, false, null)) }

    @OptIn(ExperimentalCoroutinesApi::class)
    private val allStudents = trainerId.filterNotNull().flatMapLatest { studentsRepository.observe(it) }
        .map<StudentsCache, StudentsCache?> { it }
        .onStart { emit(null) }

    val uiState: StateFlow<ChallengeDetailUiState> =
        combine(catalog, allStudents, online, combine(pick, notice, goneByPost, studentsFailed, ::Flags)) { c, s, on, f ->
            val (p, n, g) = f
            val students = s?.students.orEmpty()
            ChallengeDetailUiState(
                loaded = c.read,
                challenge = c.challenge.takeIf { !g },
                gone = g || (c.synced && c.challenge == null),
                offline = !on,
                students = students.filter { it.active }.sortedBy { it.name.lowercase() },
                studentsLoad = when {
                    s?.lastSyncedAt != null -> StudentsLoad.READY
                    f.studentsFailed -> StudentsLoad.FAILED
                    else -> StudentsLoad.LOADING
                },
                pick = p,
                notice = n,
            )
        }.stateIn(viewModelScope, SharingStarted.Eagerly, ChallengeDetailUiState())

    private var names: Map<String, String> = emptyMap()

    init {
        viewModelScope.launch { allStudents.collect { c -> names = c?.students.orEmpty().associate { it.id to it.name } } }
    }

    /** Refresca los desafíos y los alumnos: entrar por Más sin pasar por Alumnos no deja la hoja vacía. */
    fun onStart() {
        viewModelScope.launch { repository.refreshCatalog(trainerId.filterNotNull().first()) }
        refreshStudents()
    }

    fun onRetryStudents() = refreshStudents()

    private fun refreshStudents() {
        studentsFailed.value = false
        viewModelScope.launch {
            studentsFailed.value = studentsRepository.refresh(trainerId.filterNotNull().first()).isFailure
        }
    }

    fun onAssign() {
        if (uiState.value.challenge == null || pick.value != null) return
        notice.value = null
        pick.value = PickState()
    }

    fun onToggle(studentId: String) = pick.update { p ->
        if (p == null || p.submitting) return@update p
        val next = if (studentId in p.selected) p.selected - studentId else p.selected + studentId
        p.copy(selected = next, error = null)
    }

    fun onDismissPick() = pick.update { if (it?.submitting == true) it else null }

    fun onDismissNotice() {
        notice.value = null
    }

    /** Un solo POST aunque se toque dos veces: mientras sale, la hoja no acepta otro. */
    fun onSubmit() {
        val current = pick.value ?: return
        if (current.submitting || current.selected.isEmpty() || current.selected.size > MAX_BATCH) return
        if (!online.value) {
            pick.value = current.copy(error = NEEDS_NETWORK)
            return
        }
        pick.value = current.copy(submitting = true, error = null)
        // En el orden de la lista (por nombre), así el resumen también sale ordenado.
        val ids = uiState.value.students.map { it.id }.filter { it in current.selected }
        viewModelScope.launch {
            repository.assignMany(trainerId.filterNotNull().first(), challengeId, ids)
                .onSuccess { result ->
                    pick.value = null
                    notice.value = batchSummary(result) { names[it] ?: "Alumno" }
                }
                .onFailure { e ->
                    if (e is ChallengeGoneException) {
                        pick.value = null
                        goneByPost.value = true
                        return@onFailure
                    }
                    val offline = (e as? DataException)?.error == DataError.Offline
                    pick.value = current.copy(submitting = false, error = if (offline) NEEDS_NETWORK else ASSIGN_FAILED)
                }
        }
    }

    private data class Flags(val pick: PickState?, val notice: String?, val gone: Boolean, val studentsFailed: Boolean)

    private data class Catalog(val read: Boolean, val synced: Boolean, val challenge: Challenge?)
}
