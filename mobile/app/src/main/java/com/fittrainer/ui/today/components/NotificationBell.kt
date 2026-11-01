package com.fittrainer.ui.today.components

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import com.fittrainer.ui.notifications.NotificationTexts
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * Campana del encabezado de Hoy. Con avisos sin leer lleva el número (más de 9: "9+"). Toque de 44.
 * El badge cuelga del BadgedBox, por fuera del IconButton: así el clip circular del botón no lo recorta.
 */
@Composable
fun NotificationBell(unread: Int, onClick: () -> Unit) {
    BadgedBox(
        badge = {
            // La descripción de la campana ya dice el número: el badge no se lee dos veces.
            if (unread > 0) Badge(Modifier.clearAndSetSemantics { }) { Text(NotificationTexts.badge(unread)) }
        },
    ) {
        IconButton(onClick = onClick, modifier = Modifier.size(Spacing.minTouchTarget)) {
            Icon(
                Icons.Filled.Notifications,
                contentDescription = NotificationTexts.bellDescription(unread),
                tint = FtColors.TextPrimary,
            )
        }
    }
}
