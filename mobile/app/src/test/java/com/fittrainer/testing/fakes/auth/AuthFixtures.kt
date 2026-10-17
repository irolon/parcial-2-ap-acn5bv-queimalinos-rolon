package com.fittrainer.testing.fakes.auth

import com.fittrainer.data.auth.AuthState
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.session.Role
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

fun authState(
    access: String = "access-1",
    refresh: String = "refresh-1",
    role: Role = Role.STUDENT,
    session: String = "session-1",
    createdAt: Long = CREATED_AT,
) = AuthState(access, refresh, AuthUser("u1", "Ana", "ana@test.com", role), session, createdAt)

/** Momento del login de [authState] por defecto; es la hora de [fixedClock]. */
const val CREATED_AT = 1_000L

fun httpError(code: Int, body: String = "{}") = HttpException(Response.error<Any>(code, body.toResponseBody(null)))

/** Body de error del backend con [code]. */
fun apiError(status: Int, code: String) = httpError(status, """{"error":{"code":"$code","message":"x"}}""")
