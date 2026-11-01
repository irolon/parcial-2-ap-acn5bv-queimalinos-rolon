package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.components.bodymap.BodyMap
import com.fittrainer.ui.components.bodymap.busiestView
import com.fittrainer.ui.components.bodymap.rememberBodyMap
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.MuscleGroupSummary
import com.fittrainer.ui.today.musclesRowText
import com.fittrainer.ui.today.paintedParts

/** Fila entera tocable de la tarjeta de la rutina: miniatura del cuerpo, grupos y "Ver músculos de hoy". */
@Composable
fun MusclesRow(groups: List<MuscleGroupSummary>, onClick: () -> Unit) {
    val shape = MaterialTheme.shapes.medium
    val painted = remember(groups) { paintedParts(groups) }
    val data = rememberBodyMap()
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = Spacing.minTouchTarget)
            .background(FtColors.Surface, shape)
            .border(1.dp, FtColors.Border, shape)
            .clickable(role = Role.Button, onClickLabel = "Ver músculos de hoy", onClick = onClick)
            .padding(Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        // Sin datos del cuerpo (cargando o falló): la fila sigue andando, sin miniatura.
        data?.let { BodyMap(painted, listOf(busiestView(it.data, painted)), "", Modifier.size(29.dp, 56.dp)) }
        Column(Modifier.weight(1f)) {
            Text(musclesRowText(groups), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
            Text("Ver músculos de hoy", style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = FtColors.TextSecondary)
    }
}
