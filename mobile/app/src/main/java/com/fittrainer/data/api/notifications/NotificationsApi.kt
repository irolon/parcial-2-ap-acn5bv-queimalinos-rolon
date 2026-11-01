package com.fittrainer.data.api.notifications

import com.fittrainer.data.auth.RequiredUser
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Tag

/**
 * Notificaciones del usuario logueado (cliente principal: Bearer + refresh transparente). Las escrituras
 * llevan [RequiredUser]: una marca pendiente de u1 nunca sale con el JWT de otra cuenta.
 */
interface NotificationsApi {
    /**
     * `before` es el `next_before` de la página anterior; Retrofit codifica el `+` de la zona horaria.
     * `unreadOnly` true: solo las no leídas (null no manda el parámetro).
     */
    @GET("notifications")
    suspend fun list(
        @Query("limit") limit: Int,
        @Query("before") before: String? = null,
        @Query("unread_only") unreadOnly: Boolean? = null,
    ): NotificationPageDto

    @PATCH("notifications/{id}/read")
    suspend fun markRead(@Tag owner: RequiredUser, @Path("id") id: String)

    @POST("notifications/tokens")
    suspend fun registerToken(@Tag owner: RequiredUser, @Body body: PushTokenDto)

    /** El token va como path: Retrofit lo codifica (`encoded = false` por defecto). */
    @DELETE("notifications/tokens/{token}")
    suspend fun removeToken(@Tag owner: RequiredUser, @Path("token") token: String)
}
