package com.fittrainer.ui.challenges.trainer.section

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.challenges.trainer.Challenge
import com.fittrainer.data.challenges.trainer.ChallengeAlreadyActiveException
import com.fittrainer.data.challenges.trainer.ChallengeGoneException
import com.fittrainer.data.challenges.trainer.STATUS_ACTIVE
import com.fittrainer.data.challenges.trainer.StudentChallenge
import com.fittrainer.data.challenges.trainer.StudentChallengesCache
import com.fittrainer.data.challenges.trainer.TrainerChallengesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.challenges.trainer.ALREADY_ACTIVE
import com.fittrainer.ui.challenges.trainer.ASSIGNED_ONE
import com.fittrainer.ui.challenges.trainer.ASSIGN_FAILED
import com.fittrainer.ui.challenges.trainer.CHALLENGE_GONE
import com.fittrainer.ui.challenges.trainer.NEEDS_NETWORK
import com.fittrainer.ui.challenges.trainer.STUDENT_CHALLENGES_FAILED
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.Instant
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
import kotlinx.coroutines.launch

/** La hoja "Asignar desafío": la lista, el desafío que se está mandando y el error del último intento. */
data class PickChallengeState(val sending: String? = null, val error: String? = null)

/** activeIds: los desafíos que el alumno ya tiene activos (en la hoja no se pueden volver a elegir). */
data class ChallengesSectionUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val items: List<StudentChallenge> = emptyList(),
    val offline: Boolean = false,
    val loadError: String? = null,
    val catalog: List<Challenge> = emptyList(),
    val activeIds: Set<String> = emptySet(),
    val pick: PickChallengeState? = null,
    val notice: String? = null,
    val now: Instant = Instant.EPOCH,
)

/** Sección "Desafíos" de la ficha (E14): el avance del alumno y asignarle uno. */
@HiltViewModel
class ChallengesSectionViewModel @Inject constructor(
    private val repository: TrainerChallengesRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val loadError = MutableStateFlow<String?>(null)
    private val pick = MutableStateFlow<PickChallengeState?>(null)
    private val notice = MutableStateFlow<String?>(null)
    private var refreshing = false

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = trainerId.filterNotNull()
        .flatMapLatest { repository.observeStudent(it, studentId) }
        .map<StudentChallengesCache?, Pair<Boolean, StudentChallengesCache?>> { true to it }
        .onStart { emit(false to null) }

    @OptIn(ExperimentalCoroutinesApi::class)
    private val catalog = trainerId.filterNotNull()
        .flatMapLatest { repository.observeCatalog(it) }
        .map { it?.challenges.orEmpty() }
        .onStart { emit(emptyList()) }

    private val flags = combine(online, loadError, pick, notice) { on, error, p, n -> Flags(!on, error, p, n) }

    val uiState: StateFlow<ChallengesSectionUiState> = combine(cache, catalog, flags) { c, list, f ->
        val items = c.second?.items.orEmpty()
        ChallengesSectionUiState(
            loaded = c.first, everSynced = c.second?.fetchedAt != null, items = items, offline = f.offline, loadError = f.error,
            catalog = list, activeIds = items.filter { it.status == STATUS_ACTIVE }.map { it.challengeId }.toSet(),
            pick = f.pick, notice = f.notice, now = clock.instant(),
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ChallengesSectionUiState())

    /** Al volver a la ficha. */
    fun onStart() = refresh()

    fun onRetry() = refresh()

    private fun refresh() {
        if (refreshing) return
        refreshing = true
        loadError.value = null
        viewModelScope.launch {
            val error = repository.refreshStudent(trainerId.filterNotNull().first(), studentId).exceptionOrNull()
            val offline = (error as? DataException)?.error == DataError.Offline
            loadError.value = if (error != null && !offline) STUDENT_CHALLENGES_FAILED else null
            refreshing = false
        }
    }

    /** Abre la hoja y refresca la lista de desafíos. */
    fun onOpenPick() {
        if (pick.value != null) return
        notice.value = null
        pick.value = PickChallengeState()
        viewModelScope.launch { repository.refreshCatalog(trainerId.filterNotNull().first()) }
    }

    fun onDismissPick() {
        if (pick.value?.sending == null) pick.value = null
    }

    fun onDismissNotice() {
        notice.value = null
    }

    /** Un solo POST aunque se toque dos veces (o se toque otro desafío mientras sale). */
    fun onPick(challengeId: String) {
        val current = pick.value ?: return
        if (current.sending != null || challengeId in uiState.value.activeIds) return
        if (!online.value) {
            pick.value = current.copy(error = NEEDS_NETWORK)
            return
        }
        pick.value = PickChallengeState(sending = challengeId)
        viewModelScope.launch {
            val trainer = trainerId.filterNotNull().first()
            repository.assignToStudent(trainer, studentId, challengeId)
                .onSuccess {
                    pick.value = null
                    notice.value = ASSIGNED_ONE
                    refresh()
                }
                .onFailure { e ->
                    val message = when {
                        e is ChallengeAlreadyActiveException -> ALREADY_ACTIVE
                        e is ChallengeGoneException -> CHALLENGE_GONE
                        (e as? DataException)?.error == DataError.Offline -> NEEDS_NETWORK
                        else -> ASSIGN_FAILED
                    }
                    pick.value = PickChallengeState(error = message)
                    if (e is ChallengeAlreadyActiveException) refresh()
                }
        }
    }

    private data class Flags(val offline: Boolean, val error: String?, val pick: PickChallengeState?, val notice: String?)
}
