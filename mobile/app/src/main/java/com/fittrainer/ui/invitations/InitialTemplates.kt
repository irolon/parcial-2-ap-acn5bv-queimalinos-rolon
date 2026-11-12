package com.fittrainer.ui.invitations

import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.templates.trainer.TemplateSummary
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.ui.components.levelLabel
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Las plantillas que el entrenador puede elegir al invitar. [Ready] vacío = todavía no tiene ninguna. */
sealed interface TemplateChoices {
    data object Loading : TemplateChoices
    data object Failed : TemplateChoices
    data class Ready(val templates: List<TemplateSummary>) : TemplateChoices
}

/** "Push A · 4 días · Intermedio"; sin nivel, sin el último tramo. */
fun templateOptionLabel(t: TemplateSummary): String {
    val days = if (t.days.size == 1) "1 día" else "${t.days.size} días"
    return listOfNotNull(t.name, days, levelLabel(t.level)).joinToString(" · ")
}

/** Plantillas desde Room (el repositorio refresca desde la API); sin caché, Loading hasta que termina el refresh. */
class InitialTemplatesSource @Inject constructor(
    private val templates: TrainerTemplatesRepository,
    session: SessionRepository,
) {
    private val trainerId = session.session.map { (it as? Session.Trainer)?.user?.id }.filterNotNull().distinctUntilChanged()
    private val failed = MutableStateFlow(false)

    @OptIn(ExperimentalCoroutinesApi::class)
    fun choices(scope: CoroutineScope): StateFlow<TemplateChoices> {
        scope.launch { refresh() }
        return trainerId
            .flatMapLatest { id -> combine(templates.observeList(id), failed) { cache, fail -> choiceOf(cache?.templates, fail) } }
            .stateIn(scope, SharingStarted.Eagerly, TemplateChoices.Loading)
    }

    suspend fun refresh() {
        failed.value = templates.refreshList(trainerId.first()).isFailure
    }

    private fun choiceOf(list: List<TemplateSummary>?, fail: Boolean): TemplateChoices = when {
        list != null -> TemplateChoices.Ready(list)
        fail -> TemplateChoices.Failed
        else -> TemplateChoices.Loading
    }
}
