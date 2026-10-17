package com.fittrainer.data.session

import com.fittrainer.data.auth.AuthUser

enum class Role { STUDENT, TRAINER }

/** Estado de sesión que decide qué navegación ve el usuario. */
sealed interface Session {
    data object LoggedOut : Session
    data class Student(val user: AuthUser) : Session
    data class Trainer(val user: AuthUser) : Session
}
