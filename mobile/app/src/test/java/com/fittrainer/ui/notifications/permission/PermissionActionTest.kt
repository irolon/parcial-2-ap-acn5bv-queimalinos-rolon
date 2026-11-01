package com.fittrainer.ui.notifications.permission

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Qué hace "Activar" en el cartel (revisión de Pablo: Android 13+ y el canal apagado solo). */
class PermissionActionTest {
    @Test fun android13SinPermisoLoPideAlSistema() {
        assertEquals(PermissionAction.REQUEST, permissionAction(runtimePermission = true, granted = false, appEnabled = false, channelEnabled = true))
    }

    @Test fun conPermisoPeroTodasApagadasAbreLosAjustesDeLaApp() {
        assertEquals(PermissionAction.APP_SETTINGS, permissionAction(runtimePermission = true, granted = true, appEnabled = false, channelEnabled = true))
        assertEquals(PermissionAction.APP_SETTINGS, permissionAction(runtimePermission = false, granted = true, appEnabled = false, channelEnabled = false))
    }

    @Test fun soloElCanalApagadoAbreLosAjustesDelCanal() {
        assertEquals(PermissionAction.CHANNEL_SETTINGS, permissionAction(runtimePermission = true, granted = true, appEnabled = true, channelEnabled = false))
        assertEquals(PermissionAction.CHANNEL_SETTINGS, permissionAction(runtimePermission = false, granted = true, appEnabled = true, channelEnabled = false))
    }

    @Test fun elDialogoNoSalioSoloSiNoHabiaExplicacionNiAntesNiDespues() {
        assertTrue(dialogWasSkipped(granted = false, rationaleBefore = false, rationaleAfter = false)) // negado para siempre
        assertFalse(dialogWasSkipped(granted = false, rationaleBefore = false, rationaleAfter = true)) // primera negativa
        assertFalse(dialogWasSkipped(granted = false, rationaleBefore = true, rationaleAfter = false)) // segunda negativa
        assertFalse(dialogWasSkipped(granted = true, rationaleBefore = false, rationaleAfter = false))
    }
}
