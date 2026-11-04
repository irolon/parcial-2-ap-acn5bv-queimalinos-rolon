package com.fittrainer.navigation

import com.fittrainer.navigation.trainer.TRAINER_CHAT_ROUTE
import com.fittrainer.navigation.trainer.TRAINER_MESSAGES_ROUTE
import com.fittrainer.navigation.trainer.TRAINER_STUDENT_CHAT_ROUTE
import com.fittrainer.navigation.trainer.trainerChatRoute
import com.fittrainer.ui.notifications.launch.NavTarget
import com.fittrainer.ui.notifications.launch.PendingNav
import org.junit.Assert.assertEquals
import org.junit.Test

/** Tarjeta 18: los pasos para llegar al chat desde un push de mensaje. */
class NotificationNavStepsMessageTest {
    private val trainerChat = PendingNav(NavTarget.TrainerChat("s1"), fromList = false)
    private val toChat = listOf(NavStep.Tab(TRAINER_MESSAGES_ROUTE), NavStep.Push(trainerChatRoute("s1")))

    @Test fun elAlumnoVuelveASuPestanaMensajesComoLaDejoSalvoQueYaEsteAhi() {
        val chat = PendingNav(NavTarget.StudentChat, fromList = false)
        // restore: la pestaña vuelve con su borrador (texto y foto), como al tocarla en la barra.
        assertEquals(listOf(NavStep.Tab(STUDENT_MESSAGES_ROUTE, restore = true)), navSteps(chat, STUDENT_TODAY_ROUTE))
        assertEquals(emptyList<NavStep>(), navSteps(chat, STUDENT_MESSAGES_ROUTE))
    }

    @Test fun elEntrenadorPasaPorMensajesAntesDelChat() {
        // Atrás desde el chat vuelve a la lista de conversaciones.
        assertEquals(toChat, navSteps(trainerChat, TRAINER_HOME_ROUTE))
    }

    @Test fun conEseChatYaAbiertoNoSeRecreaYConservaElBorrador() {
        assertEquals(emptyList<NavStep>(), navSteps(trainerChat, TRAINER_CHAT_ROUTE, currentStudentId = "s1"))
        assertEquals(emptyList<NavStep>(), navSteps(trainerChat, TRAINER_STUDENT_CHAT_ROUTE, currentStudentId = "s1"))
    }

    @Test fun conElChatDeOtroAlumnoAbiertoSeVaAlDelPush() {
        assertEquals(toChat, navSteps(trainerChat, TRAINER_CHAT_ROUTE, currentStudentId = "s2"))
    }
}
