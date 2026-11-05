package com.fittrainer.data.agenda.student

import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.agenda.createdMillis
import com.fittrainer.data.agenda.isoMillis
import com.fittrainer.data.api.agenda.AppointmentDto
import com.fittrainer.data.api.agenda.FreeSlotDto
import com.fittrainer.data.db.agenda.student.StudentAppointmentEntity
import com.fittrainer.data.db.agenda.student.StudentFreeSlotEntity
import com.fittrainer.data.students.ARGENTINA
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter

fun AppointmentDto.toStudentEntity(studentId: String) = StudentAppointmentEntity(
    studentId, id, trainerId, isoMillis(scheduledAt), status, notes, createdMillis(createdAt),
)

fun FreeSlotDto.toEntity(studentId: String) = StudentFreeSlotEntity(studentId, isoMillis(startsAt))

/** El alumno es él mismo: el turno va sin nombre ni avatar. */
fun StudentAppointmentEntity.toDomain() = Appointment(
    id, studentId, "", null, Instant.ofEpochMilli(scheduledAt), AppointmentStatus.fromWire(status), notes,
)

/** "2026-11-06T18:00:00-03:00": hora de Argentina con su zona, como la manda la web. */
fun wireDateTime(at: Instant): String = DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(at.atZone(ARGENTINA).toOffsetDateTime())

/** Las 00:00 de Argentina de [day], en millis. */
fun dayStartMillis(day: LocalDate): Long = day.atStartOfDay(ARGENTINA).toInstant().toEpochMilli()
