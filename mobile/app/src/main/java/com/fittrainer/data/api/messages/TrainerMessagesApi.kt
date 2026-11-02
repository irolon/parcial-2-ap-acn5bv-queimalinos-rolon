package com.fittrainer.data.api.messages

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Mensajes del entrenador (E11, backend de la tarjeta 48). Conversación ajena o inexistente → 403
 * FORBIDDEN; alumno dado de baja al enviar → 409 STUDENT_INACTIVE. Sin push: la app hace polling.
 */
interface TrainerMessagesApi {
    /** Una por alumno activo, la más reciente primero (las vacías al final, por nombre). */
    @GET("messages/conversations")
    suspend fun conversations(): ConversationListResponse

    /** Página de hasta [limit] mensajes antes de [before] (exclusivo), en orden cronológico. */
    @GET("messages/{studentId}")
    suspend fun history(
        @Path("studentId") studentId: String,
        @Query("limit") limit: Int,
        @Query("before") before: String? = null,
    ): HistoryResponse

    /** Solo texto (JSON); la foto va por multipart y desde el celular no se manda. */
    @POST("messages/{studentId}")
    suspend fun send(@Path("studentId") studentId: String, @Body body: SendMessageRequest): MessageResponse

    /** Marca leídos los mensajes del alumno. */
    @POST("messages/{studentId}/read")
    suspend fun markRead(@Path("studentId") studentId: String): ReadResponse

    /** El mismo texto a 1-200 alumnos activos; si alguno no lo es, 403 y no se manda a nadie. */
    @POST("messages/broadcast")
    suspend fun broadcast(@Body body: BroadcastRequest): BroadcastResponse
}
