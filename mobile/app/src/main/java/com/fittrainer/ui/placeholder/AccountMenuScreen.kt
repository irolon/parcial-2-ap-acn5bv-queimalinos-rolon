package com.fittrainer.ui.placeholder

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Un acceso del menú (Plantillas, Biblioteca, …). */
data class MenuLink(val label: String, val onClick: () -> Unit)

/** Pestaña Perfil (alumno) / Más (entrenador): los accesos del rol, el estado del servidor y cerrar sesión. */
@Composable
fun AccountMenuScreen(title: String, onServerStatus: () -> Unit, onSignOut: () -> Unit, links: List<MenuLink> = emptyList()) {
    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Text(title, style = MaterialTheme.typography.displayMedium)
        links.forEach { link ->
            OutlinedButton(
                onClick = link.onClick,
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            ) { Text(link.label) }
        }
        OutlinedButton(
            onClick = onServerStatus,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Estado del servidor") }
        TextButton(
            onClick = onSignOut,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Cerrar sesión", color = FtColors.Coral) }
    }
}
