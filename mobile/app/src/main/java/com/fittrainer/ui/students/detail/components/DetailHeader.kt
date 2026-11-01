package com.fittrainer.ui.students.detail.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.StudentStatus
import com.fittrainer.ui.students.components.StudentAvatar
import com.fittrainer.ui.students.components.statusColor
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.students.statusLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.util.Locale

/** Avatar, nombre, "24 AÑOS · … · 4 D/SEM" y la píldora de estado (reglas de E1). */
@Composable
fun DetailHeader(name: String, line: String, status: StudentStatus?) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
        StudentAvatar(initials(name), atRisk = status == StudentStatus.INACTIVE, size = 64.dp)
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(name, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            if (line.isNotEmpty()) Text(line, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            status?.let {
                val color = statusColor(it)
                Text(
                    statusLabel(it).uppercase(Locale.ROOT),
                    modifier = Modifier.background(color.copy(alpha = 0.16f), MaterialTheme.shapes.small)
                        .padding(horizontal = Spacing.sm, vertical = 2.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = color,
                )
            }
        }
    }
}
