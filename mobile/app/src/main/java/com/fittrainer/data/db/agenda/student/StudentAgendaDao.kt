package com.fittrainer.data.db.agenda.student

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
abstract class StudentAgendaDao {

    /** Los turnos con scheduledAt desde [from], por hora. */
    @Query("SELECT * FROM student_appointments WHERE studentId = :studentId AND scheduledAt >= :from ORDER BY scheduledAt, id")
    abstract fun observeFrom(studentId: String, from: Long): Flow<List<StudentAppointmentEntity>>

    @Query("SELECT * FROM student_appointments_sync WHERE studentId = :studentId")
    abstract fun observeAppointmentsSync(studentId: String): Flow<StudentAppointmentsSyncEntity?>

    @Query("SELECT * FROM student_free_slots WHERE studentId = :studentId ORDER BY startsAt")
    abstract fun observeFreeSlots(studentId: String): Flow<List<StudentFreeSlotEntity>>

    @Query("SELECT * FROM student_free_slots_sync WHERE studentId = :studentId")
    abstract fun observeFreeSlotsSync(studentId: String): Flow<StudentFreeSlotsSyncEntity?>

    @Upsert
    abstract suspend fun upsertAppointments(rows: List<StudentAppointmentEntity>)

    @Upsert
    abstract suspend fun upsertAppointmentsSync(sync: StudentAppointmentsSyncEntity)

    @Upsert
    abstract suspend fun upsertFreeSlots(rows: List<StudentFreeSlotEntity>)

    @Upsert
    abstract suspend fun upsertFreeSlotsSync(sync: StudentFreeSlotsSyncEntity)

    @Query("DELETE FROM student_appointments WHERE studentId = :studentId AND scheduledAt >= :from AND scheduledAt < :to")
    abstract suspend fun clearRange(studentId: String, from: Long, to: Long)

    @Query("DELETE FROM student_appointments WHERE studentId = :studentId AND id = :id")
    abstract suspend fun forgetAppointment(studentId: String, id: String)

    @Query("DELETE FROM student_free_slots WHERE studentId = :studentId AND startsAt = :startsAt")
    abstract suspend fun forgetFreeSlot(studentId: String, startsAt: Long)

    @Query("DELETE FROM student_free_slots WHERE studentId = :studentId")
    abstract suspend fun clearFreeSlotRows(studentId: String)

    @Query("DELETE FROM student_appointments WHERE studentId = :studentId")
    abstract suspend fun clearOwnerAppointments(studentId: String)

    @Query("DELETE FROM student_appointments_sync WHERE studentId = :studentId")
    abstract suspend fun clearOwnerAppointmentsSync(studentId: String)

    @Query("DELETE FROM student_free_slots_sync WHERE studentId = :studentId")
    abstract suspend fun clearOwnerFreeSlotsSync(studentId: String)

    @Query("DELETE FROM student_appointments")
    abstract suspend fun clearAppointmentsAll()

    @Query("DELETE FROM student_appointments_sync")
    abstract suspend fun clearAppointmentsSyncAll()

    @Query("DELETE FROM student_free_slots")
    abstract suspend fun clearFreeSlotsAll()

    @Query("DELETE FROM student_free_slots_sync")
    abstract suspend fun clearFreeSlotsSyncAll()

    /** Los turnos de la ventana [from, to) (millis), todo o nada, y la marca de que se bajaron. */
    @Transaction
    open suspend fun replaceWindow(sync: StudentAppointmentsSyncEntity, from: Long, to: Long, rows: List<StudentAppointmentEntity>) {
        clearRange(sync.studentId, from, to)
        upsertAppointments(rows)
        upsertAppointmentsSync(sync)
    }

    /** Todos los horarios libres, todo o nada. */
    @Transaction
    open suspend fun replaceFreeSlots(sync: StudentFreeSlotsSyncEntity, rows: List<StudentFreeSlotEntity>) {
        clearFreeSlotRows(sync.studentId)
        upsertFreeSlots(rows)
        upsertFreeSlotsSync(sync)
    }

    /** El turno recién pedido entra y su horario ([slot], en millis) deja de estar libre, juntos. */
    @Transaction
    open suspend fun saveRequested(row: StudentAppointmentEntity, slot: Long) {
        upsertAppointments(listOf(row))
        forgetFreeSlot(row.studentId, slot)
    }

    @Transaction
    open suspend fun clearOwner(studentId: String) {
        clearOwnerAppointments(studentId)
        clearOwnerAppointmentsSync(studentId)
        clearFreeSlotRows(studentId)
        clearOwnerFreeSlotsSync(studentId)
    }

    @Transaction
    open suspend fun clear() {
        clearAppointmentsAll()
        clearAppointmentsSyncAll()
        clearFreeSlotsAll()
        clearFreeSlotsSyncAll()
    }
}
