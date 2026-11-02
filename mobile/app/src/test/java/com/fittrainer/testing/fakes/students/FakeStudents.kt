package com.fittrainer.testing.fakes.students

import com.fittrainer.data.api.students.AdherenceDto
import com.fittrainer.data.api.students.PageMetaDto
import com.fittrainer.data.api.students.StudentListItemDto
import com.fittrainer.data.api.students.StudentListResponse
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.students.Adherence
import com.fittrainer.data.students.TrainerStudent
import java.time.Instant

fun studentDto(
    id: String = "s1",
    name: String = "Alumno $id",
    active: Boolean = true,
    lastSessionAt: String? = "2026-10-30T15:00:00Z",
    adherence: AdherenceDto? = AdherenceDto(3, 2, 67),
) = StudentListItemDto(
    id = id, name = name, email = "$id@mail.com", goal = "hypertrophy", active = active,
    createdAt = "2026-09-01T12:00:00Z", lastSessionAt = lastSessionAt, daysPerWeek = 3, adherence = adherence,
)

fun trainerStudent(
    id: String = "s1",
    name: String = "Alumno $id",
    active: Boolean = true,
    createdAt: Instant = Instant.parse("2026-09-01T12:00:00Z"),
    lastSessionAt: Instant? = Instant.parse("2026-10-30T15:00:00Z"),
    goal: String? = "hypertrophy",
    daysPerWeek: Int = 3,
    adherence: Adherence? = Adherence(3, 2, 67),
) = TrainerStudent(id, name, "$id@mail.com", goal, active, createdAt, lastSessionAt, daysPerWeek, adherence)

/**
 * API falsa: [pages] por valor de `active` (página 1 = índice 0). [failOn] = (active, page) que lanza [error].
 */
class FakeStudentsApi(
    var pages: Map<Boolean, List<List<StudentListItemDto>>> = mapOf(true to listOf(listOf(studentDto()))),
    var failOn: Pair<Boolean, Int>? = null,
    var error: Throwable = java.io.IOException("sin red"),
) : StudentsApi {
    val calls = mutableListOf<Pair<Boolean, Int>>()

    override suspend fun list(active: Boolean, page: Int, limit: Int): StudentListResponse {
        calls += active to page
        if (failOn == active to page) throw error
        val all = pages[active].orEmpty()
        return StudentListResponse(
            data = all.getOrNull(page - 1).orEmpty(),
            meta = PageMetaDto(total = all.sumOf { it.size }, page = page, totalPages = all.size),
        )
    }
}
