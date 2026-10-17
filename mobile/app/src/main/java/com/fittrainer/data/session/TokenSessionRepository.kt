package com.fittrainer.data.session

import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.auth.tokenstore.TokenStore
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** La sesión es lo que hay en el TokenStore cifrado: si hay tokens, el usuario está adentro. */
class TokenSessionRepository @Inject constructor(
    private val tokenStore: TokenStore,
    private val authRepository: AuthRepository,
) : SessionRepository {

    override val session: Flow<Session> = tokenStore.state.map { state ->
        when (state?.user?.role) {
            null -> Session.LoggedOut
            Role.STUDENT -> Session.Student(state.user)
            Role.TRAINER -> Session.Trainer(state.user)
        }
    }

    override suspend fun signOut(): LogoutResult = authRepository.logout()
}
