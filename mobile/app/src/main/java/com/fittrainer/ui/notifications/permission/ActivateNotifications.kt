package com.fittrainer.ui.notifications.permission

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.LocalActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.fittrainer.data.notifications.push.PushChannel
import com.fittrainer.data.notifications.pushChannelEnabled

/**
 * La acción de "Activar" ([permissionAction]): pide el permiso del sistema o abre los ajustes que corresponden.
 * [onChecked] corre al volver el pedido, para releer el permiso (al volver de Ajustes lo relee el ON_START).
 */
@Composable
fun rememberActivateNotifications(onChecked: () -> Unit): () -> Unit {
    val context = LocalContext.current
    val activity = LocalActivity.current
    var rationaleBefore by remember { mutableStateOf(false) }
    val rationale = { Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && activity?.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) == true }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (dialogWasSkipped(granted, rationaleBefore, rationale())) context.startActivity(appSettings(context))
        onChecked()
    }
    return {
        val runtime = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        val granted = !runtime ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        val appEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
        when (permissionAction(runtime, granted, appEnabled, pushChannelEnabled(context))) {
            PermissionAction.REQUEST -> {
                rationaleBefore = rationale()
                launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            PermissionAction.APP_SETTINGS -> context.startActivity(appSettings(context))
            PermissionAction.CHANNEL_SETTINGS -> context.startActivity(channelSettings(context))
        }
    }
}

private fun appSettings(context: Context) = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
    .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

private fun channelSettings(context: Context) = Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
    .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    .putExtra(Settings.EXTRA_CHANNEL_ID, PushChannel.ID)
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
