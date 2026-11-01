package com.fittrainer.ui.notifications

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.notifications.NotificationDestination
import com.fittrainer.ui.notifications.components.NotificationItem
import com.fittrainer.ui.notifications.components.NotificationsStates
import com.fittrainer.ui.notifications.components.PermissionBanner
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.ZoneId

/** Lista de avisos del alumno (tarjeta 17), agrupada Hoy · Ayer · Antes. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onBack: () -> Unit,
    onOpen: (NotificationDestination) -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val zone = remember { ZoneId.systemDefault() }
    // ON_START: al entrar y al volver de los ajustes del sistema (relee el permiso).
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    LaunchedEffect(viewModel) {
        viewModel.events.collect { event -> if (event is NotificationsEvent.Open) onOpen(event.destination) }
    }
    Column(Modifier.fillMaxSize().background(FtColors.Background)) {
        NotificationsTopBar(state.hasUnread, onBack, viewModel::onMarkAllRead)
        PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = viewModel::onRefresh, modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = Spacing.lg, end = Spacing.lg, bottom = Spacing.lg),
                verticalArrangement = Arrangement.spacedBy(Spacing.sm),
            ) {
                if (!state.notificationsEnabled) item { PermissionBanner { openAppNotificationSettings(context) } }
                NotificationsStates(state, onRetry = viewModel::onRefresh)
                state.groups.forEach { (group, items) ->
                    item(key = "header-$group") {
                        Text(
                            NotificationTexts.groupLabel(group),
                            style = MaterialTheme.typography.labelLarge,
                            color = FtColors.TextSecondary,
                            modifier = Modifier.padding(top = Spacing.md),
                        )
                    }
                    items(items, key = { it.id }) { item -> NotificationItem(item, state.now, zone) { viewModel.onOpen(item) } }
                }
                // Llegar al final pide la página siguiente (cursor `before`); se vuelve a pedir si cambia la cantidad o las condiciones
                // (un pedido descartado por un refresco o por falta de red).
                if (state.hasMore) {
                    item(key = "more") {
                        val count = state.groups.sumOf { it.second.size }
                        LaunchedEffect(count, state.isRefreshing, state.isOffline, state.hasMore) { viewModel.onLoadMore() }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationsTopBar(hasUnread: Boolean, onBack: () -> Unit, onMarkAllRead: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = Spacing.xs, vertical = Spacing.xs), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack, modifier = Modifier.padding(end = Spacing.xs)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
        }
        Text(
            NotificationTexts.TITLE,
            style = MaterialTheme.typography.titleLarge,
            color = FtColors.TextPrimary,
            modifier = Modifier.weight(1f),
        )
        if (hasUnread) {
            TextButton(onClick = onMarkAllRead, modifier = Modifier.padding(end = 4.dp)) { Text(NotificationTexts.MARK_ALL_READ) }
        }
    }
}

/** "Activar": abre los ajustes de notificaciones de la app (no el permiso del sistema, que ya no se vuelve a pedir). */
private fun openAppNotificationSettings(context: Context) {
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
}
