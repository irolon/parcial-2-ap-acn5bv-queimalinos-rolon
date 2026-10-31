package com.fittrainer.testing.fakes.progress

import com.fittrainer.data.api.progress.BodyProgressDto
import com.fittrainer.data.api.progress.BodyProgressResponse
import com.fittrainer.data.api.progress.ExerciseProgressDto
import com.fittrainer.data.api.progress.ExerciseProgressResponse
import com.fittrainer.data.api.progress.ProgressApi
import kotlinx.coroutines.CompletableDeferred
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

/** API de progreso de mentira: cuenta pedidos, puede fallar y puede quedarse esperando a [gate] (carrera con el logout). */
class FakeProgressApi : ProgressApi {
    var exercises: Map<String, ExerciseProgressDto> = emptyMap()
    var body: BodyProgressDto = BodyProgressDto()
    var error: Exception? = null

    /** Error solo para ciertos ejercicios (por id); tiene prioridad sobre [error]. */
    var exerciseErrors: Map<String, Exception> = emptyMap()
    var gate: CompletableDeferred<Unit>? = null
    var exerciseCalls = 0
    var bodyCalls = 0

    override suspend fun exercise(id: String): ExerciseProgressResponse {
        exerciseCalls++
        exerciseErrors[id]?.let { throw it }
        gate?.await()
        error?.let { throw it }
        return ExerciseProgressResponse(exercises.getValue(id))
    }

    override suspend fun body(studentId: String): BodyProgressResponse {
        bodyCalls++
        gate?.await()
        error?.let { throw it }
        return BodyProgressResponse(body)
    }
}

/** Error del backend con su error.code, como lo manda el middleware de errores. */
fun httpErrorWithCode(status: Int, code: String) =
    HttpException(Response.error<Any>(status, "{\"error\":{\"code\":\"$code\"}}".toResponseBody("application/json".toMediaType())))
