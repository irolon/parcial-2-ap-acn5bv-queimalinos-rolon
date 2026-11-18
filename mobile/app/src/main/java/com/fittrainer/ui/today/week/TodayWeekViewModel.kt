package com.fittrainer.ui.today.week

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.gamification.GamificationSummary
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.ui.today.screenToday
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
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Semana de "Hoy" en día de descanso. Lee de Room (rutinas, historial, y gamificación) y refresca
 * en segundo plano; el día elegido vive acá.
 */
@HiltViewModel
class TodayWeekViewModel @Inject constructor(
    private val routines: RoutineRepository,
    private val history: HistoryRepository,
    private val gamification: GamificationRepository,
    sessionRepository: SessionRepository,
    private val clock: Clock,
) : ViewModel() {

    private val student = sessionRepository.session
        .map { (it as? Session.Student)?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val today = MutableStateFlow(hoy())
    private val selected = MutableStateFlow(today.value)

    /** Mismo "hoy" que `TodayViewModel` (fecha del dispositivo); los días de las sesiones siguen en hora argentina. */
    private fun hoy(): LocalDate = screenToday(clock)

    /** Datos de Room del alumno: rutinas, sesiones, y resumen de gamificación. */
    private data class Data(
        val routines: List<Routine>,
        val sessions: List<HistoryItem>,
        val summary: GamificationSummary?,
    )

    @OptIn(ExperimentalCoroutinesApi::class)
    private val data = student.filterNotNull().flatMapLatest { user ->
        combine(
            routines.observeCache(user.id),
            history.observe(user.id),
            gamification.observeSummary(user.id),
        ) { cache, sessions, summary -> Data(cache.routines, sessions, summary) }
    }

    val state: StateFlow<TodayWeekState> = combine(data, today, selected) { d, hoy, elegido ->
        weekState(hoy, elegido, d.routines, d.sessions, d.summary)
    }.stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5_000),
        weekState(today.value, selected.value, emptyList(), emptyList(), null),
    )

    /** Toca un día: se ignoran las fechas fuera de la semana actual. */
    fun select(date: LocalDate) {
        if (date in weekDates(today.value)) selected.value = date
    }

    /** La pantalla quedó visible: recalcula el día (el elegido vuelve a hoy solo si cambió la fecha) y refresca. */
    fun onStart() {
        val previous = today.value
        today.value = hoy()
        selected.value = selectionAfterStart(previous, today.value, selected.value)
        refresh()
    }

    /** Los dos refrescos en paralelo (espera al alumno si la sesión todavía no emitió); los resultados se ignoran (si falla, queda lo de Room). */
    fun refresh() {
        viewModelScope.launch {
            // Si la sesión todavía no emitió, espera al alumno en vez de perder el refresco de apertura.
            val id = student.filterNotNull().first().id
            launch { history.refresh(id) }
            launch { gamification.refresh(id) }
        }
    }
}
