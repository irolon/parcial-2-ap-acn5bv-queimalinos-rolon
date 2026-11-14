package com.fittrainer.ui.account.edit

import com.fittrainer.data.account.MyProfile
import com.fittrainer.data.account.NAME_ERROR
import com.fittrainer.data.account.PHONE_ERROR
import com.fittrainer.data.account.ProfileField
import com.fittrainer.data.account.TITLE_ERROR
import com.fittrainer.data.session.Role
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EditProfileFormTest {
    private val student = MyProfile(Role.STUDENT, "Ana", "ana@test.com", "11 5555 5555", null, null, Instant.EPOCH)
    private val trainer = MyProfile(Role.TRAINER, "Profe", "p@test.com", null, null, "Lic.", Instant.EPOCH)

    @Test fun sinCambiosNoHayNadaQueMandar() {
        assertTrue(student.toForm().changesFrom(student, Role.STUDENT).isEmpty())
        // Espacios alrededor no son un cambio.
        assertTrue(EditProfileForm(" Ana ", "11 5555 5555 ").changesFrom(student, Role.STUDENT).isEmpty())
    }

    @Test fun soloLoCambiadoYVaciarElTelefonoLoBorra() {
        assertEquals(mapOf(ProfileField.PHONE to null), EditProfileForm("Ana", "").changesFrom(student, Role.STUDENT))
        assertEquals(mapOf(ProfileField.NAME to "Ana María"), EditProfileForm("Ana María ", "11 5555 5555").changesFrom(student, Role.STUDENT))
    }

    @Test fun elEntrenadorNoMandaTelefonoYElAlumnoNoMandaTitulo() {
        assertEquals(mapOf(ProfileField.TITLE to null), EditProfileForm("Profe", "123456", "").changesFrom(trainer, Role.TRAINER))
        assertTrue(EditProfileForm("Ana", "11 5555 5555", "Lic.").changesFrom(student, Role.STUDENT).isEmpty())
    }

    @Test fun cadaRolValidaSusCampos() {
        assertEquals(mapOf(ProfileField.NAME to NAME_ERROR, ProfileField.PHONE to PHONE_ERROR), EditProfileForm("A", "12").errors(Role.STUDENT))
        assertEquals(mapOf(ProfileField.TITLE to TITLE_ERROR), EditProfileForm("Profe", "12", "L").errors(Role.TRAINER))
    }
}
