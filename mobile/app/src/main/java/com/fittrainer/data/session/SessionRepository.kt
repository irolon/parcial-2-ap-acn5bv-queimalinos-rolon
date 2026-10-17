package com.fittrainer.data.session

import kotlinx.coroutines.flow.Flow

/**
 * Sesión del usuario. La implementación actual es PROVISORIA (solo guarda el rol):
 * la tarjeta de auth mobile la reemplaza por JWT en EncryptedSharedPreferences
 * sin cambiar esta interfaz.
 */
interface SessionRepository {
    val session: Flow<Session>
    suspend fun signInAs(role: Role)
    suspend fun signOut()
}
