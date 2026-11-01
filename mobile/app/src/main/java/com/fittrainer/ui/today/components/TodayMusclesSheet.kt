package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.components.bodymap.BodyMap
import com.fittrainer.ui.components.bodymap.BodyView
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.MuscleGroupSummary
import com.fittrainer.ui.today.paintedParts
import kotlinx.coroutines.launch

/** Hoja con el cuerpo de frente y de espalda y los grupos musculares de la rutina de hoy. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayMusclesSheet(routineName: String, groups: List<MuscleGroupSummary>, onDismiss: () -> Unit) {
    val painted = remember(groups) { paintedParts(groups) }
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()
    // La ✕ cierra con la misma animación que deslizar la hoja, y avisa recién cuando terminó de bajar.
    val closeAnimated: () -> Unit = { scope.launch { sheetState.hide() }.invokeOnCompletion { onDismiss() } }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = FtColors.Surface) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = Spacing.lg)
                .padding(bottom = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("MÚSCULOS DE HOY", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
                    Text(routineName, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
                }
                IconButton(onClick = closeAnimated) { Icon(Icons.Filled.Close, contentDescription = "Cerrar") }
            }
            Box(
                Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.md),
                Alignment.Center,
            ) {
                BodyMap(
                    painted,
                    listOf(BodyView.FRONT, BodyView.BACK),
                    "Músculos de hoy: " + groups.joinToString(", ") { it.label },
                    Modifier.size(282.dp, 260.dp),
                )
            }
            groups.forEach { GroupLine(it) }
        }
    }
}

@Composable
private fun GroupLine(group: MuscleGroupSummary) {
    Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md), verticalAlignment = Alignment.Top) {
        Box(Modifier.padding(top = 6.dp).size(8.dp).background(FtColors.Brand, CircleShape))
        Column(Modifier.weight(1f)) {
            Text(group.label, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
            Text(group.exercises.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        Text(
            if (group.sets == 1) "1 SERIE" else "${group.sets} SERIES",
            style = MaterialTheme.typography.labelSmall,
            color = FtColors.TextSecondary,
        )
    }
}
