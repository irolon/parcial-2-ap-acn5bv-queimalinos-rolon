package com.fittrainer.ui.workout.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.exercise
import com.fittrainer.data.workout.setAt
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.setTabLabel

/** S1…Sn: hechas con "kg·reps" (tocables para corregir), la de pantalla resaltada, las que faltan apagadas. */
@Composable
fun SetTabs(workout: Workout, shownSet: Int, onSelect: (Int) -> Unit) {
    val position = workout.cursor.position
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        (1..workout.exercise(position).totalSets).forEach { n ->
            val done = workout.setAt(position, n)
            val selected = n == shownSet
            val tappable = done != null || n == workout.cursor.setNumber
            val background = when {
                selected -> FtColors.Brand
                done != null -> FtColors.Elevated
                else -> FtColors.Card
            }
            Column(
                Modifier
                    .weight(1f)
                    .heightIn(min = 52.dp)
                    .clip(MaterialTheme.shapes.medium)
                    .background(background)
                    .clickable(enabled = tappable) { onSelect(n) }
                    .padding(vertical = Spacing.xs),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val textColor = if (done == null && !selected) FtColors.Ink5 else FtColors.TextPrimary
                Text("S$n", style = MaterialTheme.typography.titleSmall, color = textColor)
                done?.let { Text(setTabLabel(it), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary) }
            }
        }
    }
}
