package com.fittrainer.testing.fakes.messages

import com.fittrainer.data.api.messages.BroadcastRequest
import com.fittrainer.data.api.messages.BroadcastResponse
import com.fittrainer.data.api.messages.BroadcastResult
import com.fittrainer.data.api.messages.ConversationDto
import com.fittrainer.data.api.messages.ConversationListResponse
import com.fittrainer.data.api.messages.CounterpartDto
import com.fittrainer.data.api.messages.HistoryMeta
import com.fittrainer.data.api.messages.HistoryResponse
import com.fittrainer.data.api.messages.LastMessageDto
import com.fittrainer.data.api.messages.MessageDto
import com.fittrainer.data.api.messages.MessageResponse
import com.fittrainer.data.api.messages.ReadResponse
import com.fittrainer.data.api.messages.SendMessageRequest
import com.fittrainer.data.api.messages.TrainerMessagesApi
import kotlinx.coroutines.CompletableDeferred
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okio.Buffer

/** Un mensaje del servidor; [minute] arma el created_at (2026-11-01T12:mm). */
fun messageDto(
    id: String, minute: Int, fromTrainer: Boolean = false, student: String = "s1", read: Boolean = false,
    broadcast: String? = null, image: String? = null, body: String? = "Mensaje $id", hasImage: Boolean? = null,
) =
    MessageDto(
        id, student, if (fromTrainer) "trainer" else "student", body, image, broadcast,
        if (read) "2026-11-01T13:00:00.000000+00:00" else null, "2026-11-01T12:%02d:00.000000+00:00".format(minute),
        hasImage,
    )

fun conversationDto(id: String, name: String, unread: Int = 0, last: String? = "Hola") = ConversationDto(
    CounterpartDto(id, name),
    last?.let { LastMessageDto(it, false, "student", "2026-11-01T12:00:00.000000+00:00") },
    unread,
)

/** Respuestas configurables. gate: si está, history espera a que se complete (para las carreras). */
class FakeTrainerMessagesApi : TrainerMessagesApi {
    var conversations = listOf(conversationDto("s1", "Ana", unread = 2), conversationDto("s2", "Beto", last = null))
    /** Páginas por cursor: null = la más nueva. */
    var pages: Map<String?, HistoryResponse> = mapOf(null to page(messageDto("m1", 1), messageDto("m2", 2, fromTrainer = true)))
    var error: Throwable? = null
    var sendError: Throwable? = null
    var gate: CompletableDeferred<Unit>? = null
    /** Si está, send y sendPhoto esperan a que se complete (un envío lento). */
    var sendGate: CompletableDeferred<Unit>? = null
    val sent = mutableListOf<Pair<String, String>>()
    /** Fotos mandadas: (alumno, bytes, epígrafe o null). */
    val photos = mutableListOf<Triple<String, ByteArray, String?>>()
    var sender = "trainer"
    val reads = mutableListOf<String>()
    val broadcasts = mutableListOf<BroadcastRequest>()
    val historyCalls = mutableListOf<String?>()
    var conversationCalls = 0
    private var nextId = 100

    fun page(vararg m: MessageDto, nextBefore: String? = null, name: String = "Ana") =
        HistoryResponse(m.toList(), HistoryMeta(nextBefore), CounterpartDto("s1", name))

    override suspend fun conversations(): ConversationListResponse {
        conversationCalls++
        error?.let { throw it }
        return ConversationListResponse(conversations)
    }

    override suspend fun history(studentId: String, limit: Int, before: String?): HistoryResponse {
        historyCalls += before
        gate?.await()
        error?.let { throw it }
        return pages[before] ?: page()
    }

    override suspend fun send(studentId: String, body: SendMessageRequest): MessageResponse {
        (sendError ?: error)?.let { throw it }
        sent += studentId to body.body
        val id = "new${nextId++}"
        return MessageResponse(MessageDto(id, studentId, sender, body.body, null, null, null, "2026-11-01T12:59:00.000000+00:00"))
    }

    override suspend fun sendPhoto(studentId: String, image: MultipartBody.Part, body: RequestBody?): MessageResponse {
        sendGate?.await()
        (sendError ?: error)?.let { throw it }
        val caption = body?.let { Buffer().also(it::writeTo).readUtf8() }
        photos += Triple(studentId, Buffer().also(image.body::writeTo).readByteArray(), caption)
        val id = "new${nextId++}"
        return MessageResponse(MessageDto(id, studentId, sender, caption, "url-$id", null, null, "2026-11-01T12:59:00.000000+00:00"))
    }

    override suspend fun markRead(studentId: String): ReadResponse {
        error?.let { throw it }
        reads += studentId
        return ReadResponse()
    }

    override suspend fun broadcast(body: BroadcastRequest): BroadcastResponse {
        error?.let { throw it }
        broadcasts += body
        return BroadcastResponse(BroadcastResult("b1", body.studentIds.size))
    }
}
