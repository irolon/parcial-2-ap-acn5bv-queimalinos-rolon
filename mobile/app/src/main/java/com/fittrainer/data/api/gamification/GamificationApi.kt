package com.fittrainer.data.api.gamification

import retrofit2.http.GET
import retrofit2.http.Path

/** Gamificación del alumno (cliente principal: Bearer + refresh transparente). */
interface GamificationApi {
    @GET("students/{studentId}/achievements/progress")
    suspend fun progress(@Path("studentId") studentId: String): AchievementsProgressResponse

    @GET("students/{studentId}/challenges")
    suspend fun challenges(@Path("studentId") studentId: String): StudentChallengesResponse
}
