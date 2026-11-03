package com.fittrainer.ui.students.overview.pending

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.overview.TodayItem
import com.fittrainer.data.students.overview.TrainerOverviewRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Los pendientes de hoy arriba del centro de avisos del entrenador (E12; antes era la hoja de la campana
 * del Inicio, E7). Lee el resumen del Inicio de Room y lo refresca al abrirse: si se llega por un push,
 * el Inicio pudo no haberse refrescado. Un refresco fallido no se muestra: queda lo guardado.
 */
@HiltViewModel
class PendingTodayViewModel @Inject constructor(
    private val repository: TrainerOverviewRepository,
    sessionRepository: SessionRepository,
) : ViewModel() {

    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    @OptIn(ExperimentalCoroutinesApi::class)
    val pending: StateFlow<List<TodayItem>> = trainerId.filterNotNull()
        .flatMapLatest { repository.observe(it) }
        .map { it?.overview?.missingToday.orEmpty() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun onStart() {
        viewModelScope.launch { repository.refresh(trainerId.filterNotNull().first()) }
    }
}
