package com.fittrainer.data.auth

import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.api.RefreshRequest
import com.fittrainer.data.api.RegisterStudentRequest
import com.fittrainer.data.api.UserDto
import com.fittrainer.data.invitation.toInvitationError
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.data.session.Role
import java.io.IOException
import java.time.Clock
import java.util.UUID
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import retrofit2.HttpException

/** Login y logout contra el backend. La sesión resultante vive en [TokenStore]. */
class AuthRepository @Inject constructor(
    private val api: AuthApi,
    private val tokenStore: TokenStore,
    private val clock: Clock,
) {
    suspend fun login(email: String, password: String): Result<AuthUser> {
        val (response, user) = try {
            val response = api.login(LoginRequest(email, password))
            response to response.user.toAuthUser()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            return Result.failure(DataException(e.toLoginError(), e))
        }
        return saveSession(response.token, response.refreshToken, user)
    }

    /** Alta del alumno con el token de su invitación: si sale bien, queda logueado como en el login. */
    suspend fun registerFromInvitation(token: String, password: String): Result<AuthUser> {
        val response = try {
            api.registerStudent(RegisterStudentRequest(token, password))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            return Result.failure(DataException(e.toInvitationError(), e))
        }
        val student = response.student
        return saveSession(response.token, response.refreshToken, AuthUser(student.id, student.name, student.email, Role.STUDENT))
    }

    // El servidor ya respondió: una falla al guardar es del almacenamiento, no de la red.
    private suspend fun saveSession(accessToken: String, refreshToken: String, user: AuthUser): Result<AuthUser> = try {
        tokenStore.save(AuthState(accessToken, refreshToken, user, UUID.randomUUID().toString(), clock.millis()))
        Result.success(user)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(DataError.Unknown, e))
    }

    /**
     * Cierra la sesión local primero (funciona sin red) y después intenta revocar el refresh token.
     * Si el disco falla al borrar, el [TokenStore] igual la da por cerrada (con una marca persistente)
     * y se revoca en el backend. Si ni siquiera se puede leer la sesión, igual se cierra (todas, porque
     * no se sabe cuál había) pero no se revoca: no hay refresh token para mandar.
     *
     * Devuelve [LogoutResult.Incomplete] si el cierre local no quedó guardado en ningún lado (la sesión
     * solo está oculta en este proceso); aun así se revoca, porque limita el daño si reaparece.
     */
    suspend fun logout(): LogoutResult {
        val state = try {
            tokenStore.read() ?: return LogoutResult.Closed
        } catch (e: IOException) {
            null
        }
        val result = try {
            tokenStore.clear()
            LogoutResult.Closed
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // SessionNotClosedException (o cualquier otra falla del almacenamiento): no tira la app,
            // se avisa y se revoca igual en el backend.
            LogoutResult.Incomplete
        }
        state?.let { revoke(it) }
        return result
    }

    /** Revoca el refresh token. Con el access vencido (401) lo renueva una vez y reintenta. */
    private suspend fun revoke(state: AuthState) {
        val body = RefreshRequest(state.refreshToken)
        try {
            if (api.logout("Bearer ${state.accessToken}", body).code() != 401) return
            val access = api.refresh(body).token
            api.logout("Bearer $access", body)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Sin red o refresh rechazado: la sesión local ya está cerrada.
        }
    }

    private fun UserDto.toAuthUser() = AuthUser(
        id = id,
        name = name,
        email = email,
        role = when (role) {
            "student" -> Role.STUDENT
            "trainer" -> Role.TRAINER
            else -> throw IllegalStateException("Rol desconocido: $role")
        },
    )

    private fun Exception.toLoginError(): DataError = when (this) {
        is IOException -> DataError.Offline
        is HttpException -> if (code() == 401) DataError.InvalidCredentials else DataError.Http(code())
        else -> DataError.Unknown
    }
}
