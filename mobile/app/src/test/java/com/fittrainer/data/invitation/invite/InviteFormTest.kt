package com.fittrainer.data.invitation.invite

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InviteFormTest {

    private val ok = InviteForm(name = "Pedro Gómez", email = "pedro@mail.com")

    @Test fun `un formulario minimo es valido`() {
        assertTrue(ok.errors().isEmpty())
    }

    @Test fun `nombre de un caracter y email sin arroba dan error`() {
        val errors = InviteForm(name = " P ", email = "pedro.mail.com").errors()
        assertEquals(setOf(InviteField.NAME, InviteField.EMAIL), errors.keys)
    }

    @Test fun `equipamiento de mas de 30 items o de 51 caracteres da error`() {
        assertTrue(InviteField.EQUIPMENT in ok.copy(equipment = List(31) { "x$it" }).errors())
        assertTrue(InviteField.EQUIPMENT in ok.copy(equipment = listOf("a".repeat(51))).errors())
        assertTrue(ok.copy(equipment = List(30) { "a".repeat(50) }).errors().isEmpty())
    }

    @Test fun `lesiones de 1001 caracteres da error`() {
        assertTrue(InviteField.INJURIES in ok.copy(injuries = "a".repeat(1001)).errors())
        assertTrue(ok.copy(injuries = "a".repeat(1000)).errors().isEmpty())
    }

    @Test fun `telefono con pocos digitos da error y vacio no`() {
        assertTrue(InviteField.PHONE in ok.copy(phone = "11-22").errors())
        assertTrue(ok.copy(phone = "  ").errors().isEmpty())
    }

    @Test fun `con telefono va por los dos canales y lo manda solo con digitos`() {
        val request = ok.copy(phone = "+54 9 11 3333-4444").toRequest()
        assertEquals("both", request.deliveryChannel)
        assertEquals("5491133334444", request.studentPhone)
    }

    @Test fun `sin telefono va solo por QR`() {
        val request = ok.toRequest()
        assertEquals("qr", request.deliveryChannel)
        assertNull(request.studentPhone)
    }

    @Test fun `opcionales vacios van en null y los textos se recortan`() {
        val request = InviteForm(
            name = "  Pedro  ", email = " pedro@mail.com ", goal = "", level = null,
            equipment = listOf(" barra ", " "), injuries = "   ",
        ).toRequest()
        assertEquals("Pedro", request.studentName)
        assertEquals("pedro@mail.com", request.studentEmail)
        assertNull(request.goal)
        assertNull(request.level)
        assertEquals(listOf("barra"), request.gymEquipment)
        assertNull(request.injuries)
        assertNull(ok.toRequest().gymEquipment)
    }

    @Test fun `campos del backend a campos del formulario`() {
        assertEquals(InviteField.EMAIL, inviteFieldOf("student_email"))
        assertEquals(InviteField.PHONE, inviteFieldOf("delivery_channel"))
        assertNull(inviteFieldOf("otro"))
    }
}
