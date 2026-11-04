package com.fittrainer.ui.students.overview.pending

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.fittrainer.data.students.overview.TodayItem
import com.fittrainer.ui.students.overview.PENDING_TODAY
import com.fittrainer.ui.students.overview.components.TodayRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Sección "Pendientes de hoy" del centro de avisos: solo si alguien debe el entrenamiento; tocar uno abre su ficha. */
fun LazyListScope.pendingTodayItems(pending: List<TodayItem>, onStudent: (String) -> Unit) {
    if (pending.isEmpty()) return
    item(key = "pending-header") {
        Text(
            PENDING_TODAY,
            style = MaterialTheme.typography.labelLarge,
            color = FtColors.TextSecondary,
            modifier = Modifier.padding(top = Spacing.md).semantics { heading() },
        )
    }
    items(pending, key = { "pending-${it.studentId}" }) { item -> TodayRow(item) { onStudent(item.studentId) } }
}
