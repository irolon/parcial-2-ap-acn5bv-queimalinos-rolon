package com.fittrainer.testing.fakes.agenda

import com.fittrainer.data.db.agenda.TrainerAgendaDao
import com.fittrainer.data.db.agenda.TrainerAgendaWeekEntity
import com.fittrainer.data.db.agenda.TrainerAppointmentEntity
import com.fittrainer.data.db.agenda.TrainerAvailabilityEntity
import com.fittrainer.data.db.agenda.TrainerAvailabilitySyncEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Room en memoria, con el mismo orden y los mismos rangos que las queries. */
class FakeTrainerAgendaDao : TrainerAgendaDao() {
    val appointments = MutableStateFlow<List<TrainerAppointmentEntity>>(emptyList())
    val weeks = MutableStateFlow<Map<Pair<String, String>, TrainerAgendaWeekEntity>>(emptyMap())
    val availability = MutableStateFlow<List<TrainerAvailabilityEntity>>(emptyList())
    val availabilitySync = MutableStateFlow<Map<String, TrainerAvailabilitySyncEntity>>(emptyMap())

    private fun TrainerAppointmentEntity.inRange(trainerId: String, from: Long, to: Long) =
        this.trainerId == trainerId && scheduledAt >= from && scheduledAt < to

    override fun observeRange(trainerId: String, from: Long, to: Long): Flow<List<TrainerAppointmentEntity>> =
        appointments.map { l -> l.filter { it.inRange(trainerId, from, to) }.sortedWith(compareBy({ it.scheduledAt }, { it.id })) }
    override fun observeWeek(trainerId: String, weekStart: String): Flow<TrainerAgendaWeekEntity?> = weeks.map { it[trainerId to weekStart] }
    override fun observeAvailability(trainerId: String): Flow<List<TrainerAvailabilityEntity>> =
        availability.map { l -> l.filter { it.trainerId == trainerId }.sortedWith(compareBy({ it.weekday }, { it.startHour })) }
    override fun observeAvailabilitySync(trainerId: String): Flow<TrainerAvailabilitySyncEntity?> = availabilitySync.map { it[trainerId] }

    override suspend fun upsertAppointments(rows: List<TrainerAppointmentEntity>) = appointments.update { old ->
        val keys = rows.map { it.trainerId to it.id }.toSet()
        old.filter { (it.trainerId to it.id) !in keys } + rows
    }
    override suspend fun upsertWeek(week: TrainerAgendaWeekEntity) = weeks.update { it + ((week.trainerId to week.weekStart) to week) }
    override suspend fun upsertAvailability(rows: List<TrainerAvailabilityEntity>) = availability.update { old ->
        val keys = rows.map { Triple(it.trainerId, it.weekday, it.startHour) }.toSet()
        old.filter { Triple(it.trainerId, it.weekday, it.startHour) !in keys } + rows
    }
    override suspend fun upsertAvailabilitySync(sync: TrainerAvailabilitySyncEntity) = availabilitySync.update { it + (sync.trainerId to sync) }

    override suspend fun clearRange(trainerId: String, from: Long, to: Long) =
        appointments.update { l -> l.filter { !it.inRange(trainerId, from, to) } }
    override suspend fun forgetAppointment(trainerId: String, id: String) =
        appointments.update { l -> l.filter { !(it.trainerId == trainerId && it.id == id) } }
    override suspend fun clearAvailabilityRows(trainerId: String) = availability.update { l -> l.filter { it.trainerId != trainerId } }
    override suspend fun clearOwnerAppointments(trainerId: String) = appointments.update { l -> l.filter { it.trainerId != trainerId } }
    override suspend fun clearOwnerWeeks(trainerId: String) = weeks.update { m -> m.filterKeys { it.first != trainerId } }
    override suspend fun clearOwnerAvailabilitySync(trainerId: String) = availabilitySync.update { it - trainerId }
    override suspend fun clearAppointmentsAll() = appointments.update { emptyList() }
    override suspend fun clearWeeksAll() = weeks.update { emptyMap() }
    override suspend fun clearAvailabilityAll() = availability.update { emptyList() }
    override suspend fun clearAvailabilitySyncAll() = availabilitySync.update { emptyMap() }
}
