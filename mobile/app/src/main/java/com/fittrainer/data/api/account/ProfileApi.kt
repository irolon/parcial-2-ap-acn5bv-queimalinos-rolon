package com.fittrainer.data.api.account

import com.fittrainer.data.auth.RequiredUser
import kotlinx.serialization.json.JsonObject
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Tag

/**
 * El perfil propio, del alumno o del entrenador, y su contraseña (GX1 #94 y GX2 #95). Cada pedido lleva a su dueño
 * ([RequiredUser]): si la cuenta cambió en el medio, no sale.
 */
interface ProfileApi {
    /** GET /students/:id con el propio id: la ficha del alumno (con `phone` y `avatar_url` firmada desde la #95). */
    @GET("students/{id}")
    suspend fun studentMe(@Tag owner: RequiredUser, @Path("id") id: String): ProfileResponse

    /** PATCH /students/:id del propio alumno: solo `name` y `phone` (otro campo → 403). Devuelve la ficha. */
    @PATCH("students/{id}")
    suspend fun updateStudent(@Tag owner: RequiredUser, @Path("id") id: String, @Body body: JsonObject): ProfileResponse

    /** PUT /students/:id/avatar, multipart con el campo `image` (JPEG/PNG/WebP, 5 MB). 413 y 415 si no sirve. */
    @Multipart
    @PUT("students/{id}/avatar")
    suspend fun setAvatar(@Tag owner: RequiredUser, @Path("id") id: String, @Part image: MultipartBody.Part): AvatarResponse

    /** DELETE /students/:id/avatar: 204, idempotente. */
    @DELETE("students/{id}/avatar")
    suspend fun removeAvatar(@Tag owner: RequiredUser, @Path("id") id: String): Response<Unit>

    /** GET /auth/me: el entrenador logueado, con su título profesional. */
    @GET("auth/me")
    suspend fun trainerMe(@Tag owner: RequiredUser): ProfileResponse

    /** PATCH /auth/me: `name` y `professional_title` (null lo borra). */
    @PATCH("auth/me")
    suspend fun updateTrainer(@Tag owner: RequiredUser, @Body body: JsonObject): ProfileResponse

    /** PUT /auth/password: devuelve un access token nuevo; el refresh actual sigue valiendo. Actual mal → 400. */
    @PUT("auth/password")
    suspend fun changePassword(@Tag owner: RequiredUser, @Body body: ChangePasswordRequest): ChangePasswordResponse
}
