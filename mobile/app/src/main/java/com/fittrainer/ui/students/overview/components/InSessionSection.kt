package com.fittrainer.ui.students.overview.components

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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.overview.InSessionItem
import com.fittrainer.ui.components.LiveDot
import com.fittrainer.ui.students.components.StudentAvatar
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.students.overview.inSessionLine
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant

/** Alumno entrenando ahora ("Pierna · hace 12 min"), con el punto verde adelante. Abre su ficha. */
@Composable
fun InSessionRow(item: InSessionItem, now: Instant, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clip(MaterialTheme.shapes.large)
            .background(FtColors.Card).clickable(onClick = onClick).padding(Spacing.md)
            .semantics(mergeDescendants = true) { contentDescription = "${item.name}, entrenando ahora" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        LiveDot()
        StudentAvatar(initials(item.name), atRisk = false, size = 40.dp)
        Column(Modifier.weight(1f)) {
            Text(item.name, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(inSessionLine(item, now), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}
