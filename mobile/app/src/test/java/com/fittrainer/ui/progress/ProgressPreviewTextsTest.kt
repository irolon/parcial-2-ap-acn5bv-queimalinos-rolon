package com.fittrainer.ui.progress

import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import java.time.Instant
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProgressPreviewTextsTest {
    private val zone = ZoneId.of("America/Argentina/Buenos_Aires")

    private fun item(id: String, at: String, kg: Double, routine: String? = "Piernas") =
        HistoryItem(id, Instant.parse(at), 50, routine, 12, kg, null, false, false, HistoryOrigin.SERVER)

    @Test fun ultimaSesionEsLaMasNuevaAunqueVengaDesordenada() {
        val items = listOf(item("a", "2026-11-03T12:00:00Z", 100.0), item("b", "2026-11-09T12:00:00Z", 200.0), item("c", "2026-11-05T12:00:00Z", 300.0))
        assertEquals("b", lastSession(items)?.id)
        assertNull(lastSession(emptyList()))
    }

    @Test fun tituloConFechaYRutinaOSinRutina() {
        assertEquals("Lun 9 nov · Piernas", lastSessionTitle(item("b", "2026-11-09T12:00:00Z", 1.0), zone))
        assertEquals("Lun 9 nov · Sin rutina", lastSessionTitle(item("b", "2026-11-09T12:00:00Z", 1.0, routine = null), zone))
    }

    @Test fun curvaConLasUltimasOchoDeLaMasViejaALaMasNueva() {
        val items = (1..10).map { item("s$it", "2026-10-%02dT12:00:00Z".format(it), it * 10.0) }.shuffled()
        assertEquals((3..10).map { it * 10.0 }, volumeTrend(items))
        assertEquals("Volumen de tus últimas 8 sesiones", chartsCardSubtitle(volumeTrend(items)))
    }

    @Test fun conMenosDeDosSesionesNoHayCurva() {
        assertTrue(volumeTrend(listOf(item("a", "2026-11-03T12:00:00Z", 100.0))).isEmpty())
        assertEquals("Tus cargas por ejercicio y tus medidas", chartsCardSubtitle(emptyList()))
    }
}
