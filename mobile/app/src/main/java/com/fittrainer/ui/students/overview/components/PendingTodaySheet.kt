package com.fittrainer.ui.students.overview.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import com.fittrainer.data.students.overview.TodayItem
import com.fittrainer.ui.students.overview.HOME_BELL
import com.fittrainer.ui.students.overview.HOME_BELL_EMPTY
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

const val PENDING_TODAY_LIST_TAG = "pendingTodayList"

/** La campana (hasta el centro de notificaciones de E12): los que hoy tienen que entrenar y todavía no lo hicieron. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PendingTodaySheet(pending: List<TodayItem>, onStudent: (String) -> Unit, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = FtColors.Surface) {
        PendingTodayList(pending, onStudent)
    }
}

/** Título y filas con scroll propio: con muchos pendientes se llega al último dentro de la altura de la hoja. */
@Composable
fun PendingTodayList(pending: List<TodayItem>, onStudent: (String) -> Unit) {
    LazyColumn(
        Modifier.testTag(PENDING_TODAY_LIST_TAG),
        contentPadding = PaddingValues(start = Spacing.lg, end = Spacing.lg, bottom = Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        item { Text(HOME_BELL, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary) }
        if (pending.isEmpty()) {
            item { Text(HOME_BELL_EMPTY, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
        }
        items(pending, key = { it.studentId }) { item -> TodayRow(item) { onStudent(item.studentId) } }
    }
}
