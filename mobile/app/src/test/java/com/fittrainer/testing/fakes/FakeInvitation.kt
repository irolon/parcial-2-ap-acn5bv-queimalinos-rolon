package com.fittrainer.testing.fakes

import com.fittrainer.data.api.InvitationApi
import com.fittrainer.data.api.InvitationDto
import com.fittrainer.data.api.InvitationTrainerDto

const val TOKEN = "3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f"

fun invitationDto(expiresAt: String = "2026-10-17T12:00:00.123456+00:00") = InvitationDto(
    trainer = InvitationTrainerDto("t1", "Laura"),
    studentName = "Tomás Rivera",
    studentEmail = "tomas@test.com",
    goal = "hypertrophy",
    expiresAt = expiresAt,
)

class FakeInvitationApi : InvitationApi {
    var response = invitationDto()
    var error: Throwable? = null
    val calls = mutableListOf<String>()

    override suspend fun get(token: String): InvitationDto {
        calls += token
        error?.let { throw it }
        return response
    }
}
