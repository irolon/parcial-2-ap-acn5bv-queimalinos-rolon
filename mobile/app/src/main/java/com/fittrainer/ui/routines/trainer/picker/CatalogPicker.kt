package com.fittrainer.ui.routines.trainer.picker

import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.ui.components.exercise.MUSCLE_ORDER
import java.text.Normalizer
import java.util.Locale
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.launch

/** Lo que muestra el selector. loaded: ya se leyó Room. */
data class PickerState(
    val loaded: Boolean = false,
    val query: String = "",
    val group: String? = null,
    val groups: List<String> = emptyList(),
    val visible: List<TrainerExercise> = emptyList(),
    val catalogEmpty: Boolean = true,
    /** El último refresh falló por la red (o todavía no hubo): si el catálogo está vacío, "Conectate". */
    val offline: Boolean = false,
    val refreshFailed: Boolean = false,
)

/**
 * Selector de la biblioteca del entrenador (E8): el catálogo de Room filtrado por texto (sin tildes ni
 * mayúsculas, todas las palabras) y por grupo. Lo usan el editor y el asistente desde su ViewModel.
 */
class CatalogPicker(
    private val repository: TrainerExercisesRepository,
    private val scope: CoroutineScope,
    private val trainerId: Flow<String?>,
) {
    private val query = MutableStateFlow("")
    private val group = MutableStateFlow<String?>(null)
    private val failure = MutableStateFlow<DataError?>(null)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val catalog = trainerId.filterNotNull().flatMapLatest { repository.observe(it) }
        .map<List<TrainerExercise>, List<TrainerExercise>?> { it }
        .onStart { emit(null) }

    val state: Flow<PickerState> = combine(catalog, query, group, failure) { list, q, g, f ->
        val all = list.orEmpty()
        val groups = availableGroups(all)
        val selected = g?.takeIf { it in groups }
        PickerState(
            loaded = list != null,
            query = q,
            group = selected,
            groups = groups,
            visible = filterExercises(all, q, selected),
            catalogEmpty = all.isEmpty(),
            offline = f == DataError.Offline,
            refreshFailed = f != null && f != DataError.Offline,
        )
    }

    /** Al abrir el selector. Si falla, queda lo que haya en Room. */
    fun refresh() {
        scope.launch {
            val error = repository.refresh(trainerId.filterNotNull().first()).exceptionOrNull()
            failure.value = (error as? DataException)?.error ?: error?.let { DataError.Unknown }
        }
    }

    fun onQuery(text: String) {
        query.value = text
    }

    fun onGroup(selected: String?) {
        group.value = selected
    }

    /** Al cerrar: la próxima vez arranca sin filtros. */
    fun reset() {
        query.value = ""
        group.value = null
    }
}

/** Grupos con ejercicios, en el orden de la biblioteca. */
fun availableGroups(exercises: List<TrainerExercise>): List<String> {
    val present = exercises.mapNotNull { it.muscleGroup }.toSet()
    return MUSCLE_ORDER.filter { it in present } + (present - MUSCLE_ORDER.toSet()).sorted()
}

/** "press banca" encuentra "Press de banca": cada palabra tiene que aparecer, sin tildes ni mayúsculas. */
fun filterExercises(exercises: List<TrainerExercise>, query: String, group: String?): List<TrainerExercise> {
    val words = normalize(query).split(' ').filter { it.isNotBlank() }
    return exercises.filter { e ->
        (group == null || e.muscleGroup == group) && normalize(e.name).let { name -> words.all { it in name } }
    }
}

private fun normalize(text: String): String =
    Normalizer.normalize(text, Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "").lowercase(Locale.ROOT)
