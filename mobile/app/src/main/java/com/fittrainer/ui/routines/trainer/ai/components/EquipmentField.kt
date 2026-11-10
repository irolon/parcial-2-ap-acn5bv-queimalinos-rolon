package com.fittrainer.ui.routines.trainer.ai.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.fittrainer.ui.components.exercise.EQUIPMENT_ORDER
import com.fittrainer.ui.components.exercise.equipmentLabel
import com.fittrainer.ui.routines.trainer.ai.AI_CHANGE
import com.fittrainer.ui.routines.trainer.ai.AI_NO_EQUIPMENT
import com.fittrainer.ui.routines.trainer.ai.AI_PROFILE_EQUIPMENT
import com.fittrainer.ui.routines.trainer.ai.AI_USE_PROFILE
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Equipamiento (E15): sin tocar, el texto de la ficha; con "Cambiar", los 7 del catálogo (ninguno = peso corporal). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EquipmentField(
    profile: String?,
    selected: List<String>?,
    enabled: Boolean,
    onChange: () -> Unit,
    onToggle: (String) -> Unit,
    onUseProfile: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text("Equipamiento", style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
        if (selected == null) {
            Text("$AI_PROFILE_EQUIPMENT: ${profile ?: AI_NO_EQUIPMENT}", color = FtColors.TextSecondary)
            TextButton(onClick = onChange, enabled = enabled) { Text(AI_CHANGE) }
        } else {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                EQUIPMENT_ORDER.forEach { code ->
                    FilterChip(selected = code in selected, onClick = { onToggle(code) }, enabled = enabled, label = { Text(equipmentLabel(code)) })
                }
            }
            TextButton(onClick = onUseProfile, enabled = enabled) { Text(AI_USE_PROFILE) }
        }
    }
}
