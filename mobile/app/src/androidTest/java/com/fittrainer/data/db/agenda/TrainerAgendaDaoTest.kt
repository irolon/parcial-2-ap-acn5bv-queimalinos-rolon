package com.fittrainer.data.db.agenda

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.agenda.weekBounds
import com.fittrainer.data.db.FitTrainerDatabase
import java.time.Instant
import java.time.LocalDate
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** E13: el reemplazo de una semana toca solo los turnos de su rango (SQL real, no el fake). */
@RunWith(AndroidJUnit4::class)
class TrainerAgendaDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: TrainerAgendaDao
    private val week = LocalDate.parse("2026-11-02")
    private val bounds = weekBounds(week)
    private val next = weekBounds(LocalDate.parse("2026-11-09"))

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
        dao = db.trainerAgendaDao()
    }

    @After fun tearDown() = db.close()

    private fun row(id: String, at: String, trainerId: String = "t1", status: String = "pending") =
        TrainerAppointmentEntity(trainerId, id, "s-$id", "Lucía", null, Instant.parse(at).toEpochMilli(), status, null, 0)

    private suspend fun ids(from: Long = bounds.from, to: Long = bounds.to, trainerId: String = "t1") =
        dao.observeRange(trainerId, from, to).first().map { it.id }

    @Test fun reemplazarUnaSemanaNoTocaLaSiguienteNiOtroEntrenador() = runTest {
        // Domingo 23 h de Argentina (lunes 02 h UTC): es de esta semana. Lunes 00 h de Argentina: de la siguiente.
        dao.upsertAppointments(
            listOf(
                row("dom", "2026-11-09T02:00:00Z"),
                row("lun", "2026-11-09T03:00:00Z"),
                row("ajeno", "2026-11-04T15:00:00Z", trainerId = "t2"),
                row("viejo", "2026-11-04T15:00:00Z"),
            ),
        )
        dao.replaceWeek(TrainerAgendaWeekEntity("t1", week.toString(), 5), bounds.from, bounds.to, listOf(row("nuevo", "2026-11-06T21:00:00Z")))

        assertEquals(listOf("nuevo"), ids())
        assertEquals(listOf("lun"), ids(next.from, next.to))
        assertEquals(listOf("ajeno"), ids(trainerId = "t2"))
        assertEquals(5L, dao.observeWeek("t1", week.toString()).first()?.fetchedAt)
        assertNull(dao.observeWeek("t1", "2026-11-09").first())
    }

    @Test fun losTurnosSalenPorHora() = runTest {
        dao.upsertAppointments(listOf(row("b", "2026-11-06T21:00:00Z"), row("a", "2026-11-04T15:00:00Z")))
        assertEquals(listOf("a", "b"), ids())
    }

    @Test fun cerrarSesionDeUnEntrenadorDejaLosDelOtro() = runTest {
        dao.replaceWeek(TrainerAgendaWeekEntity("t1", week.toString(), 1), bounds.from, bounds.to, listOf(row("a", "2026-11-04T15:00:00Z")))
        dao.replaceWeek(TrainerAgendaWeekEntity("t2", week.toString(), 1), bounds.from, bounds.to, listOf(row("b", "2026-11-04T15:00:00Z", "t2")))
        dao.replaceAvailability(TrainerAvailabilitySyncEntity("t1", 1), listOf(TrainerAvailabilityEntity("t1", 1, 9, 13)))
        dao.clearOwner("t1")
        assertEquals(emptyList<String>(), ids())
        assertNull(dao.observeWeek("t1", week.toString()).first())
        assertNull(dao.observeAvailabilitySync("t1").first())
        assertEquals(listOf("b"), ids(trainerId = "t2"))
        assertNotNull(dao.observeWeek("t2", week.toString()).first())
    }
}
