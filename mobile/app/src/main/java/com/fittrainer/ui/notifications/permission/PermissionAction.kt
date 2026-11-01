package com.fittrainer.ui.notifications.permission

/** Qué hace "Activar" en el cartel de notificaciones apagadas (tarjeta 17). */
enum class PermissionAction { REQUEST, APP_SETTINGS, CHANNEL_SETTINGS }

/**
 * En Android 13+ sin el permiso se pide con el diálogo del sistema (si el alumno nunca empezó una sesión, nunca se
 * pidió). Con el permiso: Ajustes de la app si están todas apagadas, o del canal si solo se apagó "Avisos de tu entrenador".
 */
fun permissionAction(runtimePermission: Boolean, granted: Boolean, appEnabled: Boolean, channelEnabled: Boolean): PermissionAction = when {
    runtimePermission && !granted -> PermissionAction.REQUEST
    appEnabled && !channelEnabled -> PermissionAction.CHANNEL_SETTINGS
    else -> PermissionAction.APP_SETTINGS
}

/**
 * El pedido volvió negado sin que el sistema mostrara el diálogo (ya estaba negado para siempre): queda Ajustes.
 * La primera negativa deja la explicación en true y la segunda llega con ella en true antes del pedido; solo cuando
 * no estaba ni antes ni después el diálogo no salió.
 */
fun dialogWasSkipped(granted: Boolean, rationaleBefore: Boolean, rationaleAfter: Boolean): Boolean =
    !granted && !rationaleBefore && !rationaleAfter
