package com.fittrainer.ui.account

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.account.MyProfile
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AccountStateTest {
    private val student = Session.Student(AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT))

    @Test fun antesDeBajarElPerfilUsaLaSesion() {
        val s = accountState(student, null, null, offline = false, refreshFailed = false, passwordChanged = false)
        assertEquals("Ana", s.name)
        assertEquals("ana@test.com", s.email)
        assertFalse(s.everLoaded)
        assertNull(s.phone)
    }

    @Test fun conElPerfilUsaRoomYConQuienEntrena() {
        val p = MyProfile(Role.STUDENT, "Ana María", "ana@test.com", "11 5555", "https://x/a.jpg", null, Instant.EPOCH)
        val s = accountState(student, p, "Laura", offline = true, refreshFailed = false, passwordChanged = true)
        assertEquals("Ana María", s.name)
        assertEquals("11 5555", s.phone)
        assertEquals("Laura", s.trainerName)
        assertTrue(s.everLoaded && s.offline && s.passwordChanged)
    }

    @Test fun sinSesionNoHayTarjeta() {
        assertNull(accountState(Session.LoggedOut, null, null, false, false, false).role)
    }
}
