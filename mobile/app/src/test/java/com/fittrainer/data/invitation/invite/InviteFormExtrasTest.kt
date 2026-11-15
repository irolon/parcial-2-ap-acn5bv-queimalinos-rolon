package com.fittrainer.data.invitation.invite

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Datos extra al invitar (#123): frecuencia, altura, peso y fecha de nacimiento. Mismas reglas que el backend. */
class InviteFormExtrasTest {

    private val today = LocalDate.of(2026, 11, 15)
    private val ok = InviteForm(name = "Pedro Gómez", email = "pedro@mail.com")

    @Test fun `los datos extra van en el pedido, con coma decimal`() {
        val request = ok.copy(weeklyFrequency = 4, height = "178", weight = "74,5", birthDate = LocalDate.of(2002, 3, 15)).toRequest()
        assertEquals(4, request.weeklyFrequency)
        assertEquals(178.0, request.heightCm!!, 0.0)
        assertEquals(74.5, request.weightKg!!, 0.0)
        assertEquals("2002-03-15", request.birthDate)
    }

    @Test fun `los extras vacios van en null y no aparecen en el json`() {
        val request = ok.copy(height = "  ", weight = "").toRequest()
        assertNull(request.weeklyFrequency)
        assertNull(request.heightCm)
        assertNull(request.weightKg)
        assertNull(request.birthDate)
        val json = kotlinx.serialization.json.Json.encodeToString(
            com.fittrainer.data.api.invitation.CreateInvitationRequest.serializer(), request,
        )
        assertTrue("height_cm" !in json && "weight_kg" !in json && "birth_date" !in json && "weekly_frequency" !in json)
    }

    @Test fun `altura y peso fuera de rango o que no son numero dan error`() {
        listOf("49", "251", "abc").forEach { assertEquals("Entre 50 y 250 cm", ok.copy(height = it).errors(today)[InviteField.HEIGHT]) }
        listOf("19", "301", "1,2,3").forEach { assertEquals("Entre 20 y 300 kg", ok.copy(weight = it).errors(today)[InviteField.WEIGHT]) }
        assertTrue(ok.copy(height = "50", weight = "300").errors(today).isEmpty())
        assertTrue(ok.copy(height = "250", weight = "20,5").errors(today).isEmpty())
    }

    @Test fun `fecha futura o anterior a 1900 da error`() {
        assertEquals("No puede ser una fecha futura", ok.copy(birthDate = today.plusDays(1)).errors(today)[InviteField.BIRTH_DATE])
        assertEquals("Desde 1900", ok.copy(birthDate = LocalDate.of(1899, 12, 31)).errors(today)[InviteField.BIRTH_DATE])
        assertTrue(ok.copy(birthDate = today).errors(today).isEmpty())
        assertTrue(ok.copy(birthDate = LocalDate.of(1900, 1, 1)).errors(today).isEmpty())
    }

    @Test fun `frecuencia fuera de 1 a 7 da error`() {
        assertTrue(InviteField.FREQUENCY in ok.copy(weeklyFrequency = 8).errors(today))
        assertTrue(InviteField.FREQUENCY in ok.copy(weeklyFrequency = 0).errors(today))
        assertTrue(ok.copy(weeklyFrequency = 7).errors(today).isEmpty())
    }

    @Test fun `campos extra del backend a campos del formulario`() {
        assertEquals(InviteField.FREQUENCY, inviteFieldOf("weekly_frequency"))
        assertEquals(InviteField.HEIGHT, inviteFieldOf("height_cm"))
        assertEquals(InviteField.WEIGHT, inviteFieldOf("weight_kg"))
        assertEquals(InviteField.BIRTH_DATE, inviteFieldOf("birth_date"))
    }
}
