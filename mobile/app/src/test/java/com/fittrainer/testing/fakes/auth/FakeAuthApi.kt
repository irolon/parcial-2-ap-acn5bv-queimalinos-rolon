package com.fittrainer.testing.fakes.auth

import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.api.LoginResponse
import com.fittrainer.data.api.RefreshRequest
import com.fittrainer.data.api.RefreshResponse
import com.fittrainer.data.api.RegisterStudentRequest
import com.fittrainer.data.api.RegisterStudentResponse
import com.fittrainer.data.api.StudentDto
import com.fittrainer.data.api.UserDto
import kotlinx.coroutines.CompletableDeferred
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.Response

/**
 * AuthApi falsa. Cada endpoint devuelve su respuesta o lanza su error; [loginGate] demora el login y
 * [onRefresh] corre durante el refresh (p. ej. para cambiar de cuenta mientras está en curso).
 */
class FakeAuthApi : AuthApi {
    var loginResponse = LoginResponse(UserDto("u1", "Ana", "ana@test.com", "student"), "access-1", "refresh-1")
    var loginError: Throwable? = null
    var loginGate: CompletableDeferred<Unit>? = null
    var refreshResponse = RefreshResponse("access-2")
    var refreshError: Throwable? = null
    var onRefresh: (suspend () -> Unit)? = null
    var logoutError: Throwable? = null
    /** Códigos que devuelven los próximos logout, en orden; vacío = 204. */
    val logoutCodes = ArrayDeque<Int>()

    var registerResponse = RegisterStudentResponse(StudentDto("s1", "Tomás Rivera", "tomas@test.com"), "access-s", "refresh-s")
    var registerError: Throwable? = null
    val registerCalls = mutableListOf<RegisterStudentRequest>()

    val loginCalls = mutableListOf<LoginRequest>()
    val refreshCalls = mutableListOf<RefreshRequest>()
    val logoutCalls = mutableListOf<Pair<String, RefreshRequest>>()

    override suspend fun login(body: LoginRequest): LoginResponse {
        loginCalls += body
        loginGate?.await()
        loginError?.let { throw it }
        return loginResponse
    }

    override suspend fun registerStudent(body: RegisterStudentRequest): RegisterStudentResponse {
        registerCalls += body
        registerError?.let { throw it }
        return registerResponse
    }

    override suspend fun refresh(body: RefreshRequest): RefreshResponse {
        refreshCalls += body
        onRefresh?.invoke()
        refreshError?.let { throw it }
        return refreshResponse
    }

    override suspend fun logout(bearer: String, body: RefreshRequest): Response<Unit> {
        logoutCalls += bearer to body
        logoutError?.let { throw it }
        val code = logoutCodes.removeFirstOrNull() ?: 204
        return if (code in 200..299) Response.success(code, Unit) else Response.error(code, "{}".toResponseBody(null))
    }
}
