package com.fittrainer.ui.progress.charts

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.progress.BodyChart
import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ChartRange
import com.fittrainer.data.progress.DEFAULT_RANGE
import com.fittrainer.data.progress.ProgressRepository
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.progress.charts.ChartsKeys.BODY_FIELD
import com.fittrainer.ui.progress.charts.ChartsKeys.EXERCISE_ID
import com.fittrainer.ui.progress.charts.ChartsKeys.METRIC
import com.fittrainer.ui.progress.charts.ChartsKeys.RANGE
import com.fittrainer.ui.progress.charts.ChartsKeys.VIEW
import com.fittrainer.ui.progress.charts.ChartsKeys.refreshKey
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Progreso → Gráficos (tarjeta 13). Lee de Room por [ProgressRepository]; nunca llama a Retrofit.
 * La vista, el ejercicio, la métrica, el período y el campo viven en [SavedStateHandle] (rotación y volver del detalle).
 */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class ChartsViewModel @Inject constructor(
    private val repository: ProgressRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
    private val savedState: SavedStateHandle,
) : ViewModel() {

    /** Por clave: corriendo, con error (banner) y ya intentado al menos una vez (sin datos → falla en la sección). */
    private data class Refresh(val running: Set<String> = emptySet(), val failed: Set<String> = emptySet(), val attempted: Set<String> = emptySet())

    private val owner: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val refreshState = MutableStateFlow(Refresh())
    private val jobs = mutableMapOf<String, Job>()

    private val view = savedState.getStateFlow<String?>(VIEW, null).map { enumOr(it, ChartsView.LOADS) }
    private val savedExercise = savedState.getStateFlow<String?>(EXERCISE_ID, null)
    private val prefs: StateFlow<ChartsPrefs> = combine(
        view,
        savedState.getStateFlow<String?>(METRIC, null),
        savedState.getStateFlow<String?>(RANGE, null),
        savedState.getStateFlow<String?>(BODY_FIELD, null),
    ) { v, m, r, f -> ChartsPrefs(v, enumOrNull<ChartMetric>(m), enumOr(r, DEFAULT_RANGE), enumOrNull<BodyField>(f)) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, ChartsPrefs(ChartsView.LOADS, null, DEFAULT_RANGE, null))

    /** null hasta que Room emite la primera lista: mientras tanto se ve la carga, no "Terminá tu primera sesión". */
    private val exercises: StateFlow<List<TrainedExercise>?> = owner.filterNotNull()
        .flatMapLatest { repository.observeTrainedExercises(it) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    /** El elegido; si no existe (nunca eligió o el 404 lo sacó de la lista), el primero que quede. */
    private val selectedId: StateFlow<String?> = combine(exercises, savedExercise) { list, saved ->
        list.orEmpty().let { l -> l.firstOrNull { it.exerciseId == saved }?.exerciseId ?: l.firstOrNull()?.exerciseId }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    init {
        // Cada ejercicio que queda elegido (el de entrada, el que toca el alumno o el siguiente tras un 404) se actualiza,
        // y también cuando el historial trae una sesión más nueva del elegido (el repositorio decide si vuelve a pedir).
        viewModelScope.launch {
            var previous: String? = null
            combine(selectedId, exercises) { id, list -> id to list?.firstOrNull { it.exerciseId == id }?.lastTrainedAt }
                .distinctUntilChanged()
                .collect { (id, _) ->
                    if (id == null) return@collect
                    // Cambió el ejercicio efectivo (lo tocó el alumno o un 404 lo corrió): la métrica vuelve a la por defecto.
                    // La primera emisión no: tras rotar, la métrica restaurada se respeta.
                    if (previous != null && previous != id) savedState[METRIC] = null
                    previous = id
                    if (currentView() == ChartsView.LOADS) refresh(force = false, view = ChartsView.LOADS, exerciseId = id)
                }
        }
        // Volvió la red: se refresca lo que se ve (si nunca se bajó, sale de "Conectate una vez" sin tocar nada).
        viewModelScope.launch {
            var wasOnline = online.value
            online.collect { now ->
                if (now && !wasOnline) refresh(force = false)
                wasOnline = now
            }
        }
    }

    private val data = combine(
        exercises,
        selectedId,
        combine(owner.filterNotNull(), selectedId) { o, id -> o to id }.flatMapLatest { (o, id) ->
            id?.let { repository.observeExercise(o, it) } ?: flowOf(null)
        },
        owner.filterNotNull().flatMapLatest { repository.observeBody(it) },
    ) { list, id, chart, body -> ChartsData(list, id, chart, body) }

    val uiState: StateFlow<ChartsUiState> = combine(data, prefs, online, refreshState) { d, p, isOnline, r ->
        val key = refreshKey(p.view, d.selectedId)
        buildChartsState(d, p, !isOnline, RefreshFlags(key in r.running, key in r.failed, key in r.attempted), LocalDate.now(clock), clock.zone)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ChartsUiState())

    fun onStart() = refresh(force = false)

    fun onRetry() = refresh(force = true)

    fun onViewSelected(view: ChartsView) {
        savedState[VIEW] = view.name
        refresh(force = false, view = view)
    }

    /** El refresco y el reinicio de la métrica los dispara el colector de [selectedId] cuando el ejercicio efectivo cambia. */
    fun onExerciseSelected(id: String) {
        savedState[EXERCISE_ID] = id
    }

    /** Desde un aviso de récord: Cargas con ese ejercicio si está en el desplegable; si no, la elección queda como estaba. */
    fun openExercise(id: String) {
        onViewSelected(ChartsView.LOADS)
        viewModelScope.launch { if (exercises.filterNotNull().first().any { it.exerciseId == id }) onExerciseSelected(id) }
    }

    fun onMetricSelected(metric: ChartMetric) {
        savedState[METRIC] = metric.name
    }

    fun onRangeSelected(range: ChartRange) {
        savedState[RANGE] = range.name
    }

    fun onBodyFieldSelected(field: BodyField) {
        savedState[BODY_FIELD] = field.name
    }

    fun dismissRefreshError() {
        val key = refreshKey(currentView(), resolveExercise()) ?: return
        refreshState.update { it.copy(failed = it.failed - key) }
    }

    /** Lee el SavedStateHandle directo: los StateFlow derivados pueden ir un paso atrás de una escritura recién hecha. */
    private fun currentView(): ChartsView = enumOr(savedState.get<String?>(VIEW), ChartsView.LOADS)

    private fun resolveExercise(): String? {
        val list = exercises.value.orEmpty()
        return list.firstOrNull { it.exerciseId == savedState.get<String?>(EXERCISE_ID) }?.exerciseId ?: list.firstOrNull()?.exerciseId
    }

    /** Refresca lo que se está viendo. Nunca dos pedidos de lo mismo a la vez. */
    private fun refresh(force: Boolean, view: ChartsView = currentView(), exerciseId: String? = resolveExercise()) {
        val key = refreshKey(view, exerciseId) ?: return
        if (jobs[key]?.isActive == true) return
        jobs[key] = viewModelScope.launch {
            val id = owner.filterNotNull().first()
            refreshState.update { it.copy(running = it.running + key) }
            val result = if (view == ChartsView.BODY) repository.refreshBody(id, force) else repository.refreshExercise(id, exerciseId!!, force)
            val cause = result.exceptionOrNull()
            // Sin red no es un error (se ve lo guardado con el aviso de "sin conexión"); un cambio de cuenta tampoco.
            // Pero un "Offline" con la conectividad diciendo que hay red es el backend inalcanzable: eso sí es falla.
            val offline = (cause as? DataException)?.error == DataError.Offline && !online.value
            val failed = cause != null && !offline && cause.cause !is AccountChangedException
            refreshState.update {
                it.copy(running = it.running - key, failed = if (failed) it.failed + key else it.failed - key, attempted = it.attempted + key)
            }
        }
    }
}
