package com.fittrainer.data.db.agenda

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
abstract class TrainerAgendaDao {

    /** Los turnos con scheduledAt en [from, to), por hora. */
    @Query(
        "SELECT * FROM trainer_appointments WHERE trainerId = :trainerId AND scheduledAt >= :from AND scheduledAt < :to " +
            "ORDER BY scheduledAt, id"
    )
    abstract fun observeRange(trainerId: String, from: Long, to: Long): Flow<List<TrainerAppointmentEntity>>

    @Query("SELECT * FROM trainer_agenda_weeks WHERE trainerId = :trainerId AND weekStart = :weekStart")
    abstract fun observeWeek(trainerId: String, weekStart: String): Flow<TrainerAgendaWeekEntity?>

    @Query("SELECT * FROM trainer_availability WHERE trainerId = :trainerId ORDER BY weekday, startHour")
    abstract fun observeAvailability(trainerId: String): Flow<List<TrainerAvailabilityEntity>>

    @Query("SELECT * FROM trainer_availability_sync WHERE trainerId = :trainerId")
    abstract fun observeAvailabilitySync(trainerId: String): Flow<TrainerAvailabilitySyncEntity?>

    @Upsert
    abstract suspend fun upsertAppointments(rows: List<TrainerAppointmentEntity>)

    @Upsert
    abstract suspend fun upsertWeek(week: TrainerAgendaWeekEntity)

    @Upsert
    abstract suspend fun upsertAvailability(rows: List<TrainerAvailabilityEntity>)

    @Upsert
    abstract suspend fun upsertAvailabilitySync(sync: TrainerAvailabilitySyncEntity)

    @Query("DELETE FROM trainer_appointments WHERE trainerId = :trainerId AND scheduledAt >= :from AND scheduledAt < :to")
    abstract suspend fun clearRange(trainerId: String, from: Long, to: Long)

    @Query("DELETE FROM trainer_appointments WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun forgetAppointment(trainerId: String, id: String)

    @Query("DELETE FROM trainer_availability WHERE trainerId = :trainerId")
    abstract suspend fun clearAvailabilityRows(trainerId: String)

    @Query("DELETE FROM trainer_appointments WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerAppointments(trainerId: String)

    @Query("DELETE FROM trainer_agenda_weeks WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerWeeks(trainerId: String)

    @Query("DELETE FROM trainer_availability_sync WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerAvailabilitySync(trainerId: String)

    @Query("DELETE FROM trainer_appointments")
    abstract suspend fun clearAppointmentsAll()

    @Query("DELETE FROM trainer_agenda_weeks")
    abstract suspend fun clearWeeksAll()

    @Query("DELETE FROM trainer_availability")
    abstract suspend fun clearAvailabilityAll()

    @Query("DELETE FROM trainer_availability_sync")
    abstract suspend fun clearAvailabilitySyncAll()

    /** Los turnos de una semana ([from], [to]: sus límites en millis), todo o nada, y la marca de que se bajó. */
    @Transaction
    open suspend fun replaceWeek(week: TrainerAgendaWeekEntity, from: Long, to: Long, rows: List<TrainerAppointmentEntity>) {
        clearRange(week.trainerId, from, to)
        upsertAppointments(rows)
        upsertWeek(week)
    }

    /** Toda la disponibilidad, todo o nada. */
    @Transaction
    open suspend fun replaceAvailability(sync: TrainerAvailabilitySyncEntity, rows: List<TrainerAvailabilityEntity>) {
        clearAvailabilityRows(sync.trainerId)
        upsertAvailability(rows)
        upsertAvailabilitySync(sync)
    }

    @Transaction
    open suspend fun clearOwner(trainerId: String) {
        clearOwnerAppointments(trainerId)
        clearOwnerWeeks(trainerId)
        clearAvailabilityRows(trainerId)
        clearOwnerAvailabilitySync(trainerId)
    }

    @Transaction
    open suspend fun clear() {
        clearAppointmentsAll()
        clearWeeksAll()
        clearAvailabilityAll()
        clearAvailabilitySyncAll()
    }
}
