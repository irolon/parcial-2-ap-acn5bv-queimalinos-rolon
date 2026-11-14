package com.fittrainer.navigation

import com.fittrainer.data.session.Session

/** Qué muestra la raíz de la app. */
enum class RootScreen { LOADING, LOGGED_OUT, FORCED_PASSWORD, STUDENT, TRAINER }

/**
 * null es "todavía leyendo la sesión guardada". El alumno con la clave temporal del PT (GX1-M1) ve solo la pantalla para
 * elegir una nueva, sin pestañas; al sacarse la marca pasa solo a las suyas. El entrenador nunca tiene la marca.
 */
fun rootScreen(session: Session?): RootScreen = when (session) {
    null -> RootScreen.LOADING
    Session.LoggedOut -> RootScreen.LOGGED_OUT
    is Session.Student -> if (session.user.mustChangePassword) RootScreen.FORCED_PASSWORD else RootScreen.STUDENT
    is Session.Trainer -> RootScreen.TRAINER
}
