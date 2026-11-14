package com.fittrainer.data.gamification

/** Lo que el sync le avisa a la gamificación (spec §3.2 y §3.4). None: los tests de sync que no la miran. */
interface GamificationSyncHook {
    /** El servidor devolvió logros recién desbloqueados al subir una sesión. */
    suspend fun onUnlocked(ownerId: String, unlocked: List<UnlockedAchievement>)

    /** Terminó una pasada que subió al menos una sesión: hay que refrescar la foto. */
    suspend fun afterUploads(ownerId: String)

    object None : GamificationSyncHook {
        override suspend fun onUnlocked(ownerId: String, unlocked: List<UnlockedAchievement>) = Unit
        override suspend fun afterUploads(ownerId: String) = Unit
    }
}
