package com.fittrainer.navigation.trainer

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fittrainer.ui.messages.trainer.chat.ChatScreen

/** Pestaña Mensajes del entrenador (E11). La lista es la pestaña; el chat cuelga de ella. */
const val TRAINER_MESSAGES_ROUTE = "trainer/messages"
const val TRAINER_CHAT_ROUTE = "trainer/messages/{studentId}"
fun trainerChatRoute(studentId: String) = "trainer/messages/$studentId"

/** El mismo chat abierto desde la ficha: cuelga de Alumnos, así Atrás vuelve a la ficha. */
const val TRAINER_STUDENT_CHAT_ROUTE = "trainer/students/{studentId}/chat"
fun trainerStudentChatRoute(studentId: String) = "trainer/students/$studentId/chat"

/** Las dos entradas al chat. Si la conversación ya no es del entrenador, vuelve a la pantalla anterior. */
fun NavGraphBuilder.trainerMessageRoutes(navController: NavHostController) {
    composable(TRAINER_CHAT_ROUTE) {
        ChatScreen(onBack = { navController.popBackStack() }, onGone = { navController.popBackStack() })
    }
    composable(TRAINER_STUDENT_CHAT_ROUTE) {
        ChatScreen(onBack = { navController.popBackStack() }, onGone = { navController.popBackStack() })
    }
}
