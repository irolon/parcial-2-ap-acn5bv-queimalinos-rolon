package com.fittrainer.data.agenda

import com.fittrainer.data.api.agenda.AppointmentDto
import com.fittrainer.data.api.agenda.AvailabilitySlotDto
import com.fittrainer.data.db.agenda.TrainerAppointmentEntity
import com.fittrainer.data.db.agenda.TrainerAvailabilityEntity
import java.time.Instant
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException

/** El nombre que muestra la web cuando el alumno no tiene (studentName de status.js). */
const val STUDENT_FALLBACK_NAME = "Alumno"

/** Un ISO con zona → epoch millis. */
internal fun isoMillis(iso: String): Long = OffsetDateTime.parse(iso).toInstant().toEpochMilli()

/** created_at solo sirve de referencia: si falta o no se puede leer queda en 0, sin perder el turno. */
internal fun createdMillis(iso: String?): Long = try {
    iso?.let(::isoMillis) ?: 0L
} catch (e: DateTimeParseException) {
    0L
}

/** "09:00" → 9. */
private fun hourOf(time: String): Int = time.substringBefore(':').toInt()

fun AppointmentDto.toEntity(trainerId: String) = TrainerAppointmentEntity(
    trainerId, id, student.id, student.name?.takeIf { it.isNotBlank() } ?: STUDENT_FALLBACK_NAME, student.avatarUrl,
    isoMillis(scheduledAt), status, notes, createdMillis(createdAt),
)

fun AvailabilitySlotDto.toEntity(trainerId: String) = TrainerAvailabilityEntity(trainerId, weekday, hourOf(startTime), hourOf(endTime))

fun TrainerAppointmentEntity.toDomain() = Appointment(
    id, studentId, studentName, studentAvatarUrl, Instant.ofEpochMilli(scheduledAt), AppointmentStatus.fromWire(status), notes,
)

fun TrainerAvailabilityEntity.toDomain() = AvailabilitySlot(weekday, startHour, endHour)
