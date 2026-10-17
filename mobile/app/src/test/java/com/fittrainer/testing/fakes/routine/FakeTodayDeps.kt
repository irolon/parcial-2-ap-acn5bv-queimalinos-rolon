package com.fittrainer.testing.fakes.routine

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

class FakeConnectivityObserver(online: Boolean = true) : ConnectivityObserver {
    val state = MutableStateFlow(online)
    override val isOnline: Flow<Boolean> = state
}

class FakeStudentSession(
    user: AuthUser = AuthUser("u1", "Ana Pérez", "ana@test.com", Role.STUDENT),
) : SessionRepository {
    override val session = MutableStateFlow<Session>(Session.Student(user))
    override suspend fun signOut() = LogoutResult.Closed
}

/** Reloj que se puede adelantar a mano (para cruzar la medianoche en un test). */
class StepClock(var now: Instant, private val zone: ZoneId = ZoneOffset.UTC) : Clock() {
    override fun getZone(): ZoneId = zone
    override fun withZone(zone: ZoneId): Clock = StepClock(now, zone)
    override fun instant(): Instant = now
}
