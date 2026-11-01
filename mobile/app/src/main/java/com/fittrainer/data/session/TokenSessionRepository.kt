package com.fittrainer.data.session

import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.auth.tokenstore.TokenStore
import com.fittrainer.data.notifications.push.PushTokenRegistry
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** La sesión es lo que hay en el TokenStore cifrado: si hay tokens, el usuario está adentro. */
class TokenSessionRepository @Inject constructor(
    private val tokenStore: TokenStore,
    private val authRepository: AuthRepository,
    private val userDataCleaners: Set<@JvmSuppressWildcards UserDataCleaner>,
    private val pushTokens: PushTokenRegistry,
) : SessionRepository {

    override val session: Flow<Session> = tokenStore.state.map { state ->
        when (state?.user?.role) {
            null -> Session.LoggedOut
            Role.STUDENT -> Session.Student(state.user)
            Role.TRAINER -> Session.Trainer(state.user)
        }
    }

    /**
     * Borra los datos locales del usuario que se va y recién después cierra la sesión. El orden importa:
     * logout() espera la revocación por red y, mientras tanto, puede entrar otra sesión (incluso de la
     * misma cuenta). Si el borrado viniera después, vaciaría el caché de esa sesión nueva; antes de
     * cerrar la sesión, en cambio, no puede haber otra. Si el borrado falla, la sesión igual se cierra:
     * el caché tiene dueño y otro usuario no lo ve. Si algún borrado falla, los demás igual se hacen.
     */
    override suspend fun signOut(): LogoutResult {
        // La baja del token de push necesita el JWT: va antes de logout(). No lanza (timeout de 5 s).
        pushTokens.unregister()
        // Sin sesión legible el dueño es desconocido: se borra todo.
        val ownerId = try {
            tokenStore.current()?.user?.id
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
        // Cada caché por separado: si uno falla, los demás igual se borran.
        userDataCleaners.forEach { cleaner ->
            try {
                cleaner.clearUserData(ownerId)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Sin acción: ver el comentario de la función.
            }
        }
        return authRepository.logout()
    }
}
