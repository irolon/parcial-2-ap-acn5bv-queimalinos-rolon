package com.fittrainer.testing.fakes.library

import com.fittrainer.data.api.ExerciseApi
import com.fittrainer.data.api.LibraryExerciseDto
import com.fittrainer.data.api.LibraryResponse
import kotlinx.coroutines.CompletableDeferred

fun libraryDto(id: String = "ex-1", muscle: String? = "chest", video: String? = null) = LibraryExerciseDto(
    id = id, name = "Ejercicio $id", muscleGroup = muscle, equipment = "Barra", description = "Desc $id", videoUrl = video,
)

/** API falsa: devuelve [response] o lanza [error]. Si [gate] no es null, espera a que se complete. */
class FakeExerciseApi(
    var response: LibraryResponse = LibraryResponse(listOf(libraryDto())),
    var error: Throwable? = null,
) : ExerciseApi {
    var calls = 0
    var gate: CompletableDeferred<Unit>? = null

    override suspend fun library(): LibraryResponse {
        calls++
        gate?.await()
        error?.let { throw it }
        return response
    }
}
