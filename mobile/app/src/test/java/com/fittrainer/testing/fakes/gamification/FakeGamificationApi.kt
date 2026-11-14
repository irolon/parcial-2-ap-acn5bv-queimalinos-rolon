package com.fittrainer.testing.fakes.gamification

import com.fittrainer.data.api.gamification.AchievementsProgressDto
import com.fittrainer.data.api.gamification.AchievementsProgressResponse
import com.fittrainer.data.api.gamification.GamificationApi
import com.fittrainer.data.api.gamification.StudentChallengeDto
import com.fittrainer.data.api.gamification.StudentChallengesResponse
import kotlinx.coroutines.CompletableDeferred

/** Backend en memoria de la gamificación. `gate`: el pedido de progreso queda "volando" hasta completarla. */
class FakeGamificationApi : GamificationApi {
    var progress: AchievementsProgressDto = progressDto()
    var challenges: List<StudentChallengeDto> = emptyList()
    var error: Throwable? = null
    var gate: CompletableDeferred<Unit>? = null
    var progressCalls = 0
    /** Corre mientras "vuela" el pedido de progreso (p. ej. el logout en medio del refresco). */
    var onProgress: () -> Unit = {}

    override suspend fun progress(studentId: String): AchievementsProgressResponse {
        progressCalls++
        onProgress()
        gate?.await()
        error?.let { throw it }
        return AchievementsProgressResponse(progress)
    }

    override suspend fun challenges(studentId: String): StudentChallengesResponse {
        error?.let { throw it }
        return StudentChallengesResponse(challenges)
    }
}
