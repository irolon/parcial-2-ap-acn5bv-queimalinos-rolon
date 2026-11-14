package com.fittrainer.data.sync.syncpass

import com.fittrainer.data.api.UnlockedAchievementDto
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.gamification.GamificationSyncHook
import com.fittrainer.data.gamification.UnlockedAchievement
import com.fittrainer.data.sync.PassResult
import com.fittrainer.data.sync.SessionUploader
import com.fittrainer.data.sync.SyncPass
import com.fittrainer.testing.fakes.sync.finishedSession
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class SyncPassGamificationTest : SyncPassTestBase() {
    private class RecordingHook : GamificationSyncHook {
        val unlocked = mutableListOf<Pair<String, List<UnlockedAchievement>>>()
        var refreshes = 0
        override suspend fun onUnlocked(ownerId: String, unlocked: List<UnlockedAchievement>) { this.unlocked += ownerId to unlocked }
        override suspend fun afterUploads(ownerId: String) { refreshes++ }
    }

    private class ThrowingHook : GamificationSyncHook {
        override suspend fun onUnlocked(ownerId: String, unlocked: List<UnlockedAchievement>) = throw RuntimeException("falla")
        override suspend fun afterUploads(ownerId: String) = throw RuntimeException("falla")
    }

    private val hook = RecordingHook()
    private val gamifiedPass = SyncPass(dao, SessionUploader(api), session, hook)

    @Test fun pasaLosLogrosDelCreateYDeLasSeriesSinRepetir() = runTest {
        seed(finishedSession("s1"))
        api.unlockedOnCreate = listOf(UnlockedAchievementDto("FIRST_SESSION", "Primera sesión", "milestone"))
        api.unlockedOnSets = listOf(
            UnlockedAchievementDto("FIRST_PR", "Primer récord", "pr"),
            UnlockedAchievementDto("FIRST_SESSION", "Primera sesión", "milestone"),
        )
        gamifiedPass.run()
        assertEquals(listOf("FIRST_SESSION", "FIRST_PR"), hook.unlocked.single().second.map { it.code })
        assertEquals("u1", hook.unlocked.single().first)
        assertEquals(1, hook.refreshes)
    }

    @Test fun sinNadaPendienteNoRefresca() = runTest {
        gamifiedPass.run()
        assertEquals(0, hook.refreshes)
    }

    @Test fun siElCreateFallaNiAnotaNiRefresca() = runTest {
        seed(finishedSession("s1"))
        api.createError = IOException("sin red")
        gamifiedPass.run()
        assertEquals(emptyList<Any>(), hook.unlocked)
        assertEquals(0, hook.refreshes)
    }

    @Test fun sinLogrosNoLlamaAOnUnlockedPeroRefresca() = runTest {
        seed(finishedSession("s1"))
        gamifiedPass.run()
        assertEquals(emptyList<Any>(), hook.unlocked)
        assertEquals(1, hook.refreshes)
    }

    @Test fun unHookQueTiraNoCortaNiCambiaLaPasada() = runTest {
        seed(finishedSession("s1"))
        api.unlockedOnCreate = listOf(UnlockedAchievementDto("FIRST_SESSION", "Primera sesión", "milestone"))
        val expected = pass.run()
        seed(finishedSession("s1"))
        val result = SyncPass(dao, SessionUploader(api), session, ThrowingHook()).run()
        assertEquals(expected, result)
        assertEquals(PassResult.DONE, result)
        assertEquals(SYNC_SYNCED, syncState("s1"))
    }
}
