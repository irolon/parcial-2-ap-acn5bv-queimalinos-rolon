package com.fittrainer.ui.challenges.trainer.list

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.challenges.trainer.Challenge
import com.fittrainer.data.challenges.trainer.ChallengesCache
import com.fittrainer.data.challenges.trainer.TrainerChallengesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.challenges.trainer.CHALLENGES_REFRESH_FAILED
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
import kotlinx.coroutines.launch

/** everSynced: la lista se bajó alguna vez (si no, no se puede decir "No hay desafíos"). */
data class ChallengesUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val challenges: List<Challenge> = emptyList(),
    val offline: Boolean = false,
    val loadError: String? = null,
)

/** Lista de desafíos (E14), desde Más: los predefinidos y los propios, de Room. */
@HiltViewModel
class ChallengesViewModel @Inject constructor(
    private val repository: TrainerChallengesRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val loadError = MutableStateFlow<String?>(null)
    private var refreshing = false

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = trainerId.filterNotNull()
        .flatMapLatest { repository.observeCatalog(it) }
        .map<ChallengesCache?, Pair<Boolean, ChallengesCache?>> { true to it }
        .onStart { emit(false to null) }

    val uiState: StateFlow<ChallengesUiState> = combine(cache, connectivity.isOnline, loadError) { c, online, error ->
        ChallengesUiState(
            loaded = c.first, everSynced = c.second != null, challenges = c.second?.challenges.orEmpty(),
            offline = !online, loadError = error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ChallengesUiState())

    fun onStart() = refresh()
    fun onRetry() = refresh()

    private fun refresh() {
        if (refreshing) return
        refreshing = true
        loadError.value = null
        viewModelScope.launch {
            val error = repository.refreshCatalog(trainerId.filterNotNull().first()).exceptionOrNull()
            val offline = (error as? DataException)?.error == DataError.Offline
            loadError.value = if (error != null && !offline) CHALLENGES_REFRESH_FAILED else null
            refreshing = false
        }
    }
}
