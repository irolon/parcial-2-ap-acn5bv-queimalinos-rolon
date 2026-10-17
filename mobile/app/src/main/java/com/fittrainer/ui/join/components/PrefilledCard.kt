package com.fittrainer.ui.join.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.invitation.Invitation
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val EXPIRES_FORMAT = DateTimeFormatter.ofPattern("dd/MM HH:mm")

@Composable
internal fun PrefilledCard(invitation: Invitation) {
    val expires = invitation.expiresAt.atZone(ZoneId.systemDefault()).format(EXPIRES_FORMAT)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(FtColors.Card, RoundedCornerShape(FtRadius.card))
            .border(1.dp, FtColors.Border, RoundedCornerShape(FtRadius.card))
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text("PRECARGADO", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        DataRow("Nombre", invitation.studentName)
        HorizontalDivider(color = FtColors.Border)
        DataRow("Email", invitation.studentEmail)
        HorizontalDivider(color = FtColors.Border)
        DataRow("Objetivo", goalLabel(invitation.goal))
        HorizontalDivider(color = FtColors.Border)
        DataRow("Vence", expires)
    }
}

@Composable
private fun DataRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
    }
}
