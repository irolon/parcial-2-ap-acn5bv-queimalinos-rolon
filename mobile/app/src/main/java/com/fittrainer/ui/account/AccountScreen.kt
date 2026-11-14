package com.fittrainer.ui.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.session.Role
import com.fittrainer.ui.account.components.MenuSection
import com.fittrainer.ui.account.components.ProfileCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

const val ACCOUNT_LIST_TAG = "accountList"

/** A dónde lleva cada acceso fijo de Perfil / Más; los del rol llegan en [AccountActions.roleLinks]. */
class AccountActions(
    val roleLinks: List<MenuLink>,
    val onEdit: () -> Unit,
    val onChangePassword: () -> Unit,
    val onNotifications: () -> Unit,
    val onServerStatus: () -> Unit,
    val onSignOut: () -> Unit,
)

/** Pestaña Perfil (alumno) / Más (entrenador): la tarjeta del perfil, los accesos agrupados y cerrar sesión. */
@Composable
fun AccountScreen(
    title: String,
    actions: AccountActions,
    passwordChanged: Boolean = false,
    onResultConsumed: () -> Unit = {},
    viewModel: AccountViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // El resultado de Cambiar contraseña llega por la entrada de navegación; se pasa al ViewModel y se consume.
    LaunchedEffect(passwordChanged) {
        if (passwordChanged) {
            viewModel.onPasswordChanged()
            onResultConsumed()
        }
    }
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    AccountContent(title, state, actions, viewModel::onDismissRefreshFailed, viewModel::onDismissPasswordChanged)
}

/** Sin ViewModel, para los tests de UI. */
@Composable
fun AccountContent(
    title: String,
    state: AccountUiState,
    actions: AccountActions,
    onDismissRefreshFailed: () -> Unit = {},
    onDismissPasswordChanged: () -> Unit = {},
) {
    val account = listOf(
        MenuLink(CHANGE_PASSWORD, actions.onChangePassword),
        MenuLink(NOTIFICATIONS_SETTINGS, actions.onNotifications),
        MenuLink(SERVER_STATUS, actions.onServerStatus),
    )
    // Scrollea: con zoom grande y letra grande la tarjeta y los dos grupos no entran (Galaxy S10, 11/11).
    LazyColumn(
        Modifier.fillMaxSize().testTag(ACCOUNT_LIST_TAG),
        contentPadding = PaddingValues(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg),
    ) {
        item { Text(title, style = MaterialTheme.typography.displayMedium) }
        if (state.passwordChanged) item { NoticeBanner(PASSWORD_CHANGED, onDismissPasswordChanged) }
        if (state.refreshFailed) item { NoticeBanner(PROFILE_REFRESH_FAILED, onDismissRefreshFailed) }
        if (state.role != null) item { ProfileCard(state, actions.onEdit) }
        item { MenuSection(if (state.role == Role.TRAINER) SECTION_TRAINER else SECTION_STUDENT, actions.roleLinks) }
        item { MenuSection(SECTION_ACCOUNT, account) }
        item {
            TextButton(
                onClick = actions.onSignOut,
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            ) { Text(SIGN_OUT, color = FtColors.Coral) }
        }
    }
}
