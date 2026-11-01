package com.fittrainer.ui.notifications.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.notifications.NotificationTexts
import com.fittrainer.ui.notifications.NotificationsUiState
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * Avisos de la tabla de estados (spec 3.2): sin red, falló el refresco y los vacíos
 * (sin red y nunca se bajó: "Conectate una vez…"; con todo bajado y nada que mostrar: "Todavía no tenés avisos").
 */
fun LazyListScope.NotificationsStates(state: NotificationsUiState, onRetry: () -> Unit) {
    // Sin red y sin nada guardado no hay "lo guardado" que mostrar: solo "Conectate una vez…".
    if (state.isOffline && state.everLoaded) item { NoticeBanner(NotificationTexts.OFFLINE) }
    if (state.refreshFailed) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                NoticeBanner(NotificationTexts.REFRESH_FAILED)
                TextButton(onClick = onRetry, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Text(NotificationTexts.RETRY)
                }
            }
        }
    }
    if (state.groups.isNotEmpty() || state.isRefreshing) return
    when {
        !state.everLoaded && state.isOffline -> item { InfoCard(NotificationTexts.NEVER_LOADED, "") }
        state.everLoaded -> item { InfoCard(NotificationTexts.EMPTY, NotificationTexts.EMPTY_HINT) }
    }
}

/** Pie de la lista mientras hay más páginas: la ruedita con "Ver más" en curso o, si falló, el aviso con Reintentar. */
@Composable
fun LoadMoreFooter(loading: Boolean, failed: Boolean, onRetry: () -> Unit) {
    when {
        loading -> Box(Modifier.fillMaxWidth().padding(vertical = Spacing.md), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(
                Modifier.size(24.dp).semantics { contentDescription = NotificationTexts.LOADING_MORE },
                color = FtColors.Brand,
                strokeWidth = 2.dp,
            )
        }
        failed -> Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            NoticeBanner(NotificationTexts.LOAD_MORE_FAILED)
            TextButton(onClick = onRetry, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Text(NotificationTexts.RETRY)
            }
        }
    }
}
