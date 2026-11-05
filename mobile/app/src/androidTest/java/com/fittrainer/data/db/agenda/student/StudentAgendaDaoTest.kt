package com.fittrainer.data.db.agenda.student

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.agenda.student.dayStartMillis
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

/** Tarjeta 16: la ventana de turnos del alumno y los horarios libres con SQL real, no el fake. */
@RunWith(AndroidJUnit4::class)
class StudentAgendaDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: StudentAgendaDao
    private val today = LocalDate.parse("2026-11-04")
    private val from = dayStartMillis(today)
    private val to = dayStartMillis(today.plusDays(61))

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
        dao = db.studentAgendaDao()
    }

    @After fun tearDown() = db.close()

    private fun millis(at: String) = Instant.parse(at).toEpochMilli()

    private fun row(id: String, at: String, studentId: String = "u1") =
        StudentAppointmentEntity(studentId, id, "t1", millis(at), "pending", null, 0)

    private suspend fun ids(studentId: String = "u1", since: Long = from) = dao.observeFrom(studentId, since).first().map { it.id }

    @Test fun reemplazarLaVentanaNoTocaLoDeAfueraNiOtroAlumno() = runTest {
        dao.upsertAppointments(
            listOf(
                row("ayer", "2026-11-03T21:00:00Z"),
                row("viejo", "2026-11-10T21:00:00Z"),
                row("lejos", "2027-02-01T21:00:00Z"),
                row("ajeno", "2026-11-10T21:00:00Z", studentId = "u2"),
            ),
        )
        dao.replaceWindow(StudentAppointmentsSyncEntity("u1", 5), from, to, listOf(row("b", "2026-11-06T21:00:00Z"), row("a", "2026-11-05T21:00:00Z")))

        // Desde hoy y por hora; lo de ayer queda en la base pero no se ve.
        assertEquals(listOf("a", "b", "lejos"), ids())
        assertEquals(listOf("ayer", "a", "b", "lejos"), ids(since = 0))
        assertEquals(listOf("ajeno"), ids("u2"))
        assertEquals(5L, dao.observeAppointmentsSync("u1").first()?.fetchedAt)
        assertNull(dao.observeAppointmentsSync("u2").first())
    }

    @Test fun pedirGuardaElTurnoYSacaSuHorarioDeLosLibres() = runTest {
        val friday = millis("2026-11-06T21:00:00Z")
        val saturday = millis("2026-11-07T13:00:00Z")
        dao.replaceFreeSlots(StudentFreeSlotsSyncEntity("u1", 1), listOf(StudentFreeSlotEntity("u1", saturday), StudentFreeSlotEntity("u1", friday)))
        assertEquals(listOf(friday, saturday), dao.observeFreeSlots("u1").first().map { it.startsAt })

        dao.saveRequested(row("nuevo", "2026-11-06T21:00:00Z"), friday)
        assertEquals(listOf(saturday), dao.observeFreeSlots("u1").first().map { it.startsAt })
        assertEquals(listOf("nuevo"), ids())

        dao.replaceFreeSlots(StudentFreeSlotsSyncEntity("u1", 2), emptyList())
        assertEquals(emptyList<Long>(), dao.observeFreeSlots("u1").first().map { it.startsAt })
        assertEquals(2L, dao.observeFreeSlotsSync("u1").first()?.fetchedAt)
    }

    @Test fun cerrarSesionDeUnAlumnoDejaLoDelOtro() = runTest {
        dao.replaceWindow(StudentAppointmentsSyncEntity("u1", 1), from, to, listOf(row("a", "2026-11-05T21:00:00Z")))
        dao.replaceWindow(StudentAppointmentsSyncEntity("u2", 1), from, to, listOf(row("b", "2026-11-05T21:00:00Z", "u2")))
        dao.replaceFreeSlots(StudentFreeSlotsSyncEntity("u1", 1), listOf(StudentFreeSlotEntity("u1", 1)))
        dao.clearOwner("u1")
        assertEquals(emptyList<String>(), ids())
        assertNull(dao.observeAppointmentsSync("u1").first())
        assertNull(dao.observeFreeSlotsSync("u1").first())
        assertEquals(listOf("b"), ids("u2"))
        assertNotNull(dao.observeAppointmentsSync("u2").first())
        dao.clear()
        assertEquals(emptyList<String>(), ids("u2"))
    }
}
