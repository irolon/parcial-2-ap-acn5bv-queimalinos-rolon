package com.fittrainer.data.session

/**
 * Borra los datos del usuario guardados en el dispositivo (cachés de Room). Se llama al cerrar sesión.
 * Con [ownerId] borra solo si los datos siguen siendo de ese usuario; null (dueño desconocido) borra todo.
 */
interface UserDataCleaner {
    suspend fun clearUserData(ownerId: String?)
}
