package com.fittrainer.data.session

enum class Role { STUDENT, TRAINER }

/** Estado de sesión que decide qué navegación ve el usuario. */
sealed interface Session {
    data object LoggedOut : Session
    data object Student : Session
    data object Trainer : Session
}
