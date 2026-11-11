package com.fittrainer.ui.invitations.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.fittrainer.data.invitation.invite.InviteField
import com.fittrainer.ui.components.DayChips
import com.fittrainer.ui.invitations.InviteUiState
import com.fittrainer.ui.invitations.TemplateChoices
import com.fittrainer.ui.invitations.templateOptionLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

private const val LABEL = "PLANTILLA INICIAL (OPCIONAL)"
private const val NONE = "Sin plantilla"

/** "Plantilla inicial": al elegir una, el alumno recibe su primera rutina con los días que se marquen. */
@Composable
fun InitialTemplateField(state: InviteUiState.Editing, onTemplate: (String?) -> Unit, onToggleDay: (String) -> Unit) {
    when (val choices = state.templates) {
        TemplateChoices.Loading -> DisabledPicker("Cargando plantillas…")
        TemplateChoices.Failed -> DisabledPicker("No pudimos cargar tus plantillas")
        is TemplateChoices.Ready -> if (choices.templates.isEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                FieldLabel(LABEL)
                Text("Todavía no tenés plantillas", color = FtColors.TextSecondary)
                state.errors[InviteField.TEMPLATE]?.let { Text(it, color = FtColors.Coral) }
            }
        } else {
            val byId = choices.templates.associateBy { it.id }
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                OptionPicker(
                    LABEL, state.form.templateId, choices.templates.map { it.id },
                    { id -> id?.let { byId[it] }?.let(::templateOptionLabel) ?: NONE },
                    state.errors[InviteField.TEMPLATE], allowNone = true, onSelect = onTemplate,
                )
                if (state.form.templateId != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                        FieldLabel("DÍAS")
                        state.errors[InviteField.DAYS]?.let { Text(it, color = FtColors.Coral) }
                        DayChips(state.form.routineDays, enabled = !state.sending, onToggle = onToggleDay)
                    }
                }
            }
        }
    }
}

@Composable
private fun DisabledPicker(text: String) =
    OptionPicker(LABEL, null, emptyList(), { text }, error = null, enabled = false, onSelect = {})
