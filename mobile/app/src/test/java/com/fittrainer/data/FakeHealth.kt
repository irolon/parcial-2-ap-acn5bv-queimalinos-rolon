package com.fittrainer.data

import com.fittrainer.data.api.FitTrainerApi
import com.fittrainer.data.api.HealthResponse
import com.fittrainer.data.db.HealthDao
import com.fittrainer.data.db.HealthSnapshotEntity
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/** API falsa: devuelve [response] o lanza [error]. Si [gate] no es null, espera a que se complete. */
class FakeHealthApi(
    var response: HealthResponse = HealthResponse("ok", "2026-10-13T12:00:00.000Z", "0.1.0"),
    var error: Throwable? = null,
) : FitTrainerApi {
    var calls = 0
    var gate: CompletableDeferred<Unit>? = null

    override suspend fun health(): HealthResponse {
        calls++
        gate?.await()
        error?.let { throw it }
        return response
    }
}

/** DAO falso en memoria con la misma semántica de una sola fila. */
class FakeHealthDao(initial: HealthSnapshotEntity? = null) : HealthDao {
    val state = MutableStateFlow(initial)
    override fun observe(): Flow<HealthSnapshotEntity?> = state
    override suspend fun upsert(entity: HealthSnapshotEntity) {
        state.value = entity
    }
}
