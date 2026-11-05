package com.fittrainer.ui.agenda

import androidx.compose.ui.graphics.Color
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.ui.theme.FtColors

/** Los colores de la web: pendiente en aviso (warn), confirmado en verde (good), cancelado en gris. */
fun statusColor(status: AppointmentStatus): Color = when (status) {
    AppointmentStatus.PENDING -> FtColors.Amber
    AppointmentStatus.CONFIRMED -> FtColors.Green
    AppointmentStatus.CANCELLED -> FtColors.Ink5
}

/** El texto del estado; el cancelado va en gris claro para que se lea sobre la tarjeta. */
fun statusTextColor(status: AppointmentStatus): Color =
    if (status == AppointmentStatus.CANCELLED) FtColors.TextSecondary else statusColor(status)
