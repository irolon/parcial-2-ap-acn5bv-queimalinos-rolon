package com.fittrainer.data.api.agenda

import com.fittrainer.di.NetworkModule
import kotlinx.serialization.encodeToString
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Tarjeta 16: el body del POST con el mismo Json que usa Retrofit. Sin nota, notes no viaja (el Json de la app no
 * codifica los valores por defecto); con nota, va tal cual.
 */
class CreateAppointmentRequestWireTest {

    private val json = NetworkModule.provideJson()

    @Test fun sinNotaNoMandaNotes() {
        val body = json.encodeToString(CreateAppointmentRequest("2026-11-06T18:00:00-03:00"))
        assertEquals("""{"scheduled_at":"2026-11-06T18:00:00-03:00"}""", body)
    }

    @Test fun conNotaLaManda() {
        val body = json.encodeToString(CreateAppointmentRequest("2026-11-06T18:00:00-03:00", "Rodilla"))
        assertEquals("""{"scheduled_at":"2026-11-06T18:00:00-03:00","notes":"Rodilla"}""", body)
    }

    @Test fun losLibresSeLeenConStartsAt() {
        val response = json.decodeFromString<FreeSlotsResponse>("""{"data":[{"starts_at":"2026-11-06T21:00:00.000Z"}]}""")
        assertEquals(listOf(FreeSlotDto("2026-11-06T21:00:00.000Z")), response.data)
    }
}
