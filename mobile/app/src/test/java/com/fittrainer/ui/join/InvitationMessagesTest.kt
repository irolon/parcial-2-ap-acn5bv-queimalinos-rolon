package com.fittrainer.ui.join

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import org.junit.Assert.assertEquals
import org.junit.Test

class InvitationMessagesTest {

    private fun msg(error: DataError) = invitationMessage(DataException(error))

    @Test fun `cada error tiene su mensaje y sus acciones`() {
        assertEquals(
            InvitationMessage("Esta invitación no existe. Pedile a tu entrenador que te mande una nueva.", canRetry = false, offerLogin = false),
            msg(DataError.InvitationNotFound),
        )
        assertEquals(
            InvitationMessage("Esta invitación venció, pedile una nueva a tu profe", canRetry = false, offerLogin = false),
            msg(DataError.InvitationExpired),
        )
        assertEquals(
            InvitationMessage("Esta invitación ya fue usada. Si ya creaste tu cuenta, iniciá sesión.", canRetry = false, offerLogin = true),
            msg(DataError.InvitationUsed),
        )
        assertEquals(
            InvitationMessage("Ya hay una cuenta con ese email. Iniciá sesión.", canRetry = false, offerLogin = true),
            msg(DataError.StudentEmailExists),
        )
        assertEquals(InvitationMessage("Sin conexión con el servidor", canRetry = true, offerLogin = false), msg(DataError.Offline))
        assertEquals(InvitationMessage("No se pudo completar el alta", canRetry = true, offerLogin = false), msg(DataError.Http(500)))
        assertEquals(InvitationMessage("No se pudo completar el alta", canRetry = true, offerLogin = false), invitationMessage(null))
    }

    @Test fun `etiquetas de objetivo`() {
        assertEquals("Tonificar", goalLabel("tonify"))
        assertEquals("Bajar de peso", goalLabel("weight_loss"))
        assertEquals("Ganar masa muscular", goalLabel("hypertrophy"))
        assertEquals("Ganar fuerza", goalLabel("strength"))
        assertEquals("yoga", goalLabel("yoga"))
        assertEquals("Sin definir", goalLabel(null))
    }
}
