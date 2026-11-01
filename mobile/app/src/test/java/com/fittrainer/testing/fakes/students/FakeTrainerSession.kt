package com.fittrainer.testing.fakes.students

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import kotlinx.coroutines.flow.MutableStateFlow

/** Sesión falsa de un entrenador logueado. */
class FakeTrainerSession(
    user: AuthUser = AuthUser("t1", "Profe Card", "profe@test.com", Role.TRAINER),
) : SessionRepository {
    override val session = MutableStateFlow<Session>(Session.Trainer(user))
    override suspend fun signOut() = LogoutResult.Closed
}
