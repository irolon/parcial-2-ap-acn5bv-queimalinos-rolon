package com.fittrainer.ui.workout.components.muscle

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.ui.components.bodymap.BodyMap
import com.fittrainer.ui.components.bodymap.BodyView
import com.fittrainer.ui.components.bodymap.partsFor
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** El cuerpo de frente y de espalda con el músculo del ejercicio pintado, y qué se trabaja. */
@Composable
fun MuscleCard(exercise: WorkoutExercise, modifier: Modifier = Modifier) {
    val label = muscleLabel(exercise.muscleGroup)
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = FtColors.Card),
        border = BorderStroke(1.dp, FtColors.Border),
    ) {
        // Una sola frase para TalkBack: el cuerpo es decorativo y el texto de al lado ya dice el músculo.
        Row(
            Modifier.fillMaxWidth().padding(Spacing.md).semantics(mergeDescendants = true) {},
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.lg),
        ) {
            BodyMap(
                partsFor(exercise.muscleGroup),
                listOf(BodyView.FRONT, BodyView.BACK),
                "",
                Modifier.size(122.dp, 112.dp),
            )
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text("TRABAJÁS", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
                Text(label, style = MaterialTheme.typography.headlineSmall, color = FtColors.BrandText)
                Text(muscleCardLine(exercise), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
            }
        }
    }
}
