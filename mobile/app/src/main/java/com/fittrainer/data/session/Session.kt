package com.fittrainer.data.session

import com.fittrainer.data.auth.AuthUser

enum class Role { STUDENT, TRAINER }

/** Estado de sesión que decide qué navegación ve el usuario. */
sealed interface Session {
    data object LoggedOut : Session
    data class Student(val user: AuthUser) : Session
    data class Trainer(val user: AuthUser) : Session
}

/** El id del usuario logueado, alumno o entrenador; null sin sesión. */
val Session?.userId: String?
    get() = when (this) {
        is Session.Student -> user.id
        is Session.Trainer -> user.id
        else -> null
    }

/** El rol del usuario logueado; null sin sesión. */
val Session?.role: Role?
    get() = when (this) {
        is Session.Student -> Role.STUDENT
        is Session.Trainer -> Role.TRAINER
        else -> null
    }
