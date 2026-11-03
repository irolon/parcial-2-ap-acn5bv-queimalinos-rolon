package com.fittrainer.ui.students.overview

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.overview.OverviewCache
import com.fittrainer.data.students.overview.TrainerOverview
import com.fittrainer.data.students.overview.TrainerOverviewRepository
import com.fittrainer.ui.students.STUDENTS_OFFLINE_ERROR
import com.fittrainer.ui.students.syncedAgo
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.Instant
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

/**
 * loaded: Room ya respondió. overview == null con loaded: nunca se bajó el resumen. error: el último
 * refresh falló (con resumen guardado se muestra como aviso; sin él, como pantalla de error).
 */
data class TrainerHomeUiState(
    val loaded: Boolean = false,
    val name: String = "",
    val today: LocalDate? = null,
    val now: Instant = Instant.EPOCH,
    val overview: TrainerOverview? = null,
    val syncedLabel: String? = null,
    val offline: Boolean = false,
    val refreshing: Boolean = false,
    val error: String? = null,
    val filter: HomeFilter = HomeFilter.TODAY,
) {
    val noStudents: Boolean get() = overview?.activeStudents == 0
    val showErrorScreen: Boolean get() = loaded && overview == null && error != null && !refreshing
}

/** Inicio del entrenador. Lee de Room; refresca al entrar (también al volver de comentar una sesión) y con pull. El filtro elegido sobrevive a los refrescos. */
@HiltViewModel
class TrainerHomeViewModel @Inject constructor(
    private val repository: TrainerOverviewRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val trainer = sessionRepository.session.map { (it as? Session.Trainer)?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(Local())

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = trainer.filterNotNull().flatMapLatest { repository.observe(it.id) }
        .map<OverviewCache?, Loaded> { Loaded(it) }.onStart { emit(Loaded(null, false)) }

    val uiState: StateFlow<TrainerHomeUiState> = combine(cache, trainer, connectivity.isOnline, local) { c, user, online, l ->
        val now = clock.instant()
        TrainerHomeUiState(
            loaded = c.loaded,
            name = user?.name.orEmpty(),
            today = LocalDate.ofInstant(now, ARGENTINA),
            now = now,
            overview = c.cache?.overview,
            syncedLabel = c.cache?.let { syncedAgo(it.fetchedAt, now) },
            offline = !online,
            refreshing = l.refreshing,
            error = l.error,
            filter = l.filter,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TrainerHomeUiState())

    fun onStart() = refresh()

    fun onPullToRefresh() = refresh()

    fun onRetry() = refresh()

    fun dismissError() = local.update { it.copy(error = null) }

    fun onFilter(filter: HomeFilter) = local.update { it.copy(filter = filter) }

    private fun refresh() {
        if (local.value.refreshing) return
        viewModelScope.launch {
            val user = trainer.filterNotNull().first()
            local.update { it.copy(refreshing = true) }
            val error = repository.refresh(user.id).exceptionOrNull()
            val text = when {
                error == null -> null
                (error as? DataException)?.error == DataError.Offline -> STUDENTS_OFFLINE_ERROR
                else -> HOME_REFRESH_FAILED
            }
            local.update { it.copy(refreshing = false, error = text) }
        }
    }

    private data class Loaded(val cache: OverviewCache?, val loaded: Boolean = true)

    private data class Local(val refreshing: Boolean = false, val error: String? = null, val filter: HomeFilter = HomeFilter.TODAY)
}
