package com.fittrainer.ui.workout.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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

/** Hasta cuántas pestañas entran repartidas en el ancho; con más, la fila se desliza. */
const val SET_TABS_FIT = 5

/** S1…Sn: hechas con "kg·reps" (tocables para corregir), la de pantalla resaltada, las que faltan apagadas. */
@Composable
fun SetTabs(workout: Workout, shownSet: Int, onSelect: (Int) -> Unit) {
    val total = workout.exercise(workout.cursor.position).totalSets
    if (total <= SET_TABS_FIT) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            (1..total).forEach { n -> SetTab(workout, n, shownSet, onSelect, Modifier.weight(1f)) }
        }
        return
    }
    val list = rememberLazyListState()
    // La serie en pantalla siempre a la vista, con una de contexto a la izquierda. También al cambiar de
    // ejercicio: el número de serie puede ser el mismo y la fila quedaría corrida donde estaba.
    LaunchedEffect(workout.cursor.position, shownSet) { list.animateScrollToItem((shownSet - 2).coerceAtLeast(0)) }
    LazyRow(Modifier.fillMaxWidth(), state = list, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        items(total) { i -> SetTab(workout, i + 1, shownSet, onSelect, Modifier.width(72.dp)) }
    }
}

@Composable
private fun SetTab(workout: Workout, n: Int, shownSet: Int, onSelect: (Int) -> Unit, modifier: Modifier) {
    val done = workout.setAt(workout.cursor.position, n)
    val selected = n == shownSet
    val tappable = done != null || n == workout.cursor.setNumber
    val background = when {
        selected -> FtColors.Brand
        done != null -> FtColors.Elevated
        else -> FtColors.Card
    }
    Column(
        modifier
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
