package com.fittrainer.testing.fakes.routine

import com.fittrainer.data.api.ExerciseDto
import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.api.RoutineApi
import com.fittrainer.data.api.RoutineExerciseDto
import com.fittrainer.data.api.StudentRoutineDto
import kotlinx.coroutines.CompletableDeferred

fun exerciseDto(id: String = "re-1", order: Int = 0) = RoutineExerciseDto(
    id = id,
    exercise = ExerciseDto(id = "ex-$id", name = "Ejercicio $id", muscleGroup = "chest"),
    sets = 4,
    reps = 8,
    restSeconds = 90,
    orderIndex = order,
)

fun routineDto(
    id: String = "rt-1",
    days: List<String> = listOf("monday"),
    createdAt: String = "2026-10-01T10:00:00+00:00",
    exercises: List<RoutineExerciseDto> = listOf(exerciseDto()),
) = StudentRoutineDto(routineId = id, name = "Rutina $id", goal = "strength", days = days, createdAt = createdAt, exercises = exercises)

/** API falsa: devuelve [response] o lanza [error]. Si [gate] no es null, espera a que se complete. */
class FakeRoutineApi(
    var response: MineResponse = MineResponse(listOf(routineDto())),
    var error: Throwable? = null,
) : RoutineApi {
    var calls = 0
    var gate: CompletableDeferred<Unit>? = null

    override suspend fun mine(): MineResponse {
        calls++
        gate?.await()
        error?.let { throw it }
        return response
    }
}
