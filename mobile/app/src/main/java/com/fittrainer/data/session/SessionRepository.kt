package com.fittrainer.data.session

import kotlinx.coroutines.flow.Flow

/** Sesión del usuario. Se inicia con el login (AuthRepository) y se observa desde la navegación raíz. */
interface SessionRepository {
    val session: Flow<Session>
    suspend fun signOut(): LogoutResult
}

/** Resultado del logout en este dispositivo. */
enum class LogoutResult {
    /** La sesión quedó cerrada y no vuelve aunque la app se reinicie. */
    Closed,

    /** Oculta solo en este proceso: no se pudo guardar el cierre y puede reaparecer al reiniciar. */
    Incomplete,
}
