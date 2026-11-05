package com.fittrainer.testing.fakes.agenda

import com.fittrainer.data.db.agenda.student.StudentAgendaDao
import com.fittrainer.data.db.agenda.student.StudentAppointmentEntity
import com.fittrainer.data.db.agenda.student.StudentAppointmentsSyncEntity
import com.fittrainer.data.db.agenda.student.StudentFreeSlotEntity
import com.fittrainer.data.db.agenda.student.StudentFreeSlotsSyncEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Room en memoria para los turnos del alumno (tarjeta 16), con el mismo orden y los mismos rangos que las queries. */
class FakeStudentAgendaDao : StudentAgendaDao() {
    val appointments = MutableStateFlow<List<StudentAppointmentEntity>>(emptyList())
    val appointmentsSync = MutableStateFlow<Map<String, StudentAppointmentsSyncEntity>>(emptyMap())
    val slots = MutableStateFlow<List<StudentFreeSlotEntity>>(emptyList())
    val slotsSync = MutableStateFlow<Map<String, StudentFreeSlotsSyncEntity>>(emptyMap())

    override fun observeFrom(studentId: String, from: Long): Flow<List<StudentAppointmentEntity>> = appointments.map { l ->
        l.filter { it.studentId == studentId && it.scheduledAt >= from }.sortedWith(compareBy({ it.scheduledAt }, { it.id }))
    }
    override fun observeAppointmentsSync(studentId: String): Flow<StudentAppointmentsSyncEntity?> = appointmentsSync.map { it[studentId] }
    override fun observeFreeSlots(studentId: String): Flow<List<StudentFreeSlotEntity>> =
        slots.map { l -> l.filter { it.studentId == studentId }.sortedBy { it.startsAt } }
    override fun observeFreeSlotsSync(studentId: String): Flow<StudentFreeSlotsSyncEntity?> = slotsSync.map { it[studentId] }

    override suspend fun upsertAppointments(rows: List<StudentAppointmentEntity>) = appointments.update { old ->
        val keys = rows.map { it.studentId to it.id }.toSet()
        old.filter { (it.studentId to it.id) !in keys } + rows
    }
    override suspend fun upsertAppointmentsSync(sync: StudentAppointmentsSyncEntity) = appointmentsSync.update { it + (sync.studentId to sync) }
    override suspend fun upsertFreeSlots(rows: List<StudentFreeSlotEntity>) = slots.update { old -> (old.filter { it !in rows } + rows) }
    override suspend fun upsertFreeSlotsSync(sync: StudentFreeSlotsSyncEntity) = slotsSync.update { it + (sync.studentId to sync) }

    override suspend fun clearRange(studentId: String, from: Long, to: Long) =
        appointments.update { l -> l.filter { !(it.studentId == studentId && it.scheduledAt >= from && it.scheduledAt < to) } }
    override suspend fun forgetAppointment(studentId: String, id: String) =
        appointments.update { l -> l.filter { !(it.studentId == studentId && it.id == id) } }
    override suspend fun forgetFreeSlot(studentId: String, startsAt: Long) =
        slots.update { l -> l.filter { !(it.studentId == studentId && it.startsAt == startsAt) } }
    override suspend fun clearFreeSlotRows(studentId: String) = slots.update { l -> l.filter { it.studentId != studentId } }
    override suspend fun clearOwnerAppointments(studentId: String) = appointments.update { l -> l.filter { it.studentId != studentId } }
    override suspend fun clearOwnerAppointmentsSync(studentId: String) = appointmentsSync.update { it - studentId }
    override suspend fun clearOwnerFreeSlotsSync(studentId: String) = slotsSync.update { it - studentId }
    override suspend fun clearAppointmentsAll() = appointments.update { emptyList() }
    override suspend fun clearAppointmentsSyncAll() = appointmentsSync.update { emptyMap() }
    override suspend fun clearFreeSlotsAll() = slots.update { emptyList() }
    override suspend fun clearFreeSlotsSyncAll() = slotsSync.update { emptyMap() }
}
