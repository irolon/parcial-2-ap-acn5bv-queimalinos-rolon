package com.fittrainer.data.students

import com.fittrainer.data.api.students.StudentListItemDto
import com.fittrainer.data.db.students.TrainerStudentEntity
import java.time.Instant
import java.time.OffsetDateTime

/** El backend manda ISO con zona ("…Z" o "…+00:00"). */
private fun parseInstant(iso: String): Instant = OffsetDateTime.parse(iso).toInstant()

fun StudentListItemDto.toEntity(trainerId: String) = TrainerStudentEntity(
    id = id,
    trainerId = trainerId,
    name = name,
    email = email,
    goal = goal?.takeIf { it.isNotBlank() },
    active = active,
    avatarUrl = avatarUrl?.takeIf { it.isNotBlank() },
    createdAt = parseInstant(createdAt).toEpochMilli(),
    lastSessionAt = lastSessionAt?.let { parseInstant(it).toEpochMilli() },
    daysPerWeek = daysPerWeek,
    adherenceAssigned = adherence?.assigned,
    adherenceDone = adherence?.done,
    adherencePct = adherence?.pct,
)

fun TrainerStudentEntity.toDomain() = TrainerStudent(
    id = id,
    name = name,
    email = email,
    goal = goal,
    active = active,
    createdAt = Instant.ofEpochMilli(createdAt),
    lastSessionAt = lastSessionAt?.let(Instant::ofEpochMilli),
    daysPerWeek = daysPerWeek,
    adherence = if (adherenceAssigned != null && adherenceDone != null) {
        Adherence(adherenceAssigned, adherenceDone, adherencePct)
    } else {
        null
    },
)
