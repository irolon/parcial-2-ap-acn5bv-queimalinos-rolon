package com.fittrainer.testing.fakes.sync

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.FailedSetDto
import com.fittrainer.data.api.SavedSetDto
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.SessionSetsRequest
import com.fittrainer.data.api.SessionSetsResponse
import com.fittrainer.data.api.SessionSetsResult
import com.fittrainer.data.api.UpdateSessionRequest
import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryDetailResponse
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.auth.RequiredUser
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

/** Backend en memoria: guarda lo que recibe y devuelve en minúscula, como el real. */
class FakeSessionApi : SessionApi {
    val created = mutableListOf<CreateSessionRequest>()
    /** Cuántas veces se llamó a create, haya fallado o no. */
    var createCalls = 0
    val batches = mutableListOf<Pair<String, SessionSetsRequest>>()
    var createError: Throwable? = null
    var setsError: Throwable? = null
    /** id de serie → code: esas vuelven en `failed`. */
    var failCodes: Map<String, String> = emptyMap()
    /** Cuenta logueada, como la ve AuthInterceptor: si no es la del tag, la request no sale. null = no se chequea. */
    var account: (() -> String?)? = null
    val updates = mutableListOf<Pair<String, UpdateSessionRequest>>()
    var updateError: Throwable? = null
    /** Páginas del historial por número; detalle por id. */
    var historyPages: Map<Int, HistoryPageDto> = emptyMap()
    var details: Map<String, HistoryDetailDto> = emptyMap()
    var historyError: Throwable? = null
    /** ids cuyo detalle falla (simula un corte a mitad del refresco). */
    var failDetails: Set<String> = emptySet()
    /** Qué tira un detalle de failDetails. */
    var detailFailure: Throwable = java.io.IOException("corte")
    /** Páginas pedidas al historial, en orden. */
    val historyRequests = mutableListOf<Int>()
    /** Si hay una puerta para esa página, el pedido queda "volando" hasta que se complete (después de anotarlo). */
    var historyGates: Map<Int, kotlinx.coroutines.CompletableDeferred<Unit>> = emptyMap()
    val detailCalls = mutableListOf<String>()
    /** Se ejecuta mientras "vuela" el pedido de un detalle (p. ej. el logout en medio del refresco). */
    var onDetail: (String) -> Unit = {}
    /** Si está puesto, cada detalle espera a que se complete (para probar lo que pasa mientras bajan). */
    var detailGate: kotlinx.coroutines.CompletableDeferred<Unit>? = null

    private fun checkAccount(owner: RequiredUser) {
        val current = account ?: return
        if (current() != owner.userId) throw AccountChangedException()
    }

    override suspend fun create(owner: RequiredUser, body: CreateSessionRequest) {
        createCalls++
        checkAccount(owner)
        createError?.let { throw it }
        created += body
    }

    override suspend fun addSets(owner: RequiredUser, id: String, body: SessionSetsRequest): SessionSetsResponse {
        checkAccount(owner)
        setsError?.let { throw it }
        batches += id to body
        val (bad, ok) = body.sets.withIndex().partition { it.value.id in failCodes }
        return SessionSetsResponse(
            SessionSetsResult(
                saved = ok.map { SavedSetDto(it.value.id.lowercase(), created = true) },
                failed = bad.map { FailedSetDto(it.value.id.lowercase(), it.index, failCodes.getValue(it.value.id)) },
            ),
        )
    }

    override suspend fun update(owner: RequiredUser, id: String, body: UpdateSessionRequest) {
        checkAccount(owner)
        updateError?.let { throw it }
        updates += id to body
    }

    override suspend fun history(studentId: String, page: Int, limit: Int): HistoryPageDto {
        historyRequests += page
        historyGates[page]?.await()
        historyError?.let { throw it }
        return historyPages[page] ?: HistoryPageDto(emptyList(), HistoryMetaDto(0, page, limit, 0))
    }

    override suspend fun historyDetail(studentId: String, sessionId: String): HistoryDetailResponse {
        detailCalls += sessionId
        onDetail(sessionId)
        detailGate?.await()
        historyError?.let { throw it }
        if (sessionId in failDetails) throw detailFailure
        return HistoryDetailResponse(details.getValue(sessionId))
    }
}

fun httpError(code: Int) = HttpException(Response.error<Any>(code, "{}".toResponseBody("application/json".toMediaType())))
