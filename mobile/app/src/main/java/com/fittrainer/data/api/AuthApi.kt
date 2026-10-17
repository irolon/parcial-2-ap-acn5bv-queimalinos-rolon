package com.fittrainer.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class UserDto(val id: String, val name: String, val email: String, val role: String)

@Serializable
data class LoginResponse(
    val user: UserDto,
    val token: String,
    @SerialName("refresh_token") val refreshToken: String,
)

@Serializable
data class RefreshRequest(@SerialName("refresh_token") val refreshToken: String)

@Serializable
data class RefreshResponse(val token: String)

@Serializable
data class RegisterStudentRequest(val token: String, val password: String)

@Serializable
data class StudentDto(val id: String, val name: String, val email: String)

@Serializable
data class RegisterStudentResponse(
    val student: StudentDto,
    val token: String,
    @SerialName("refresh_token") val refreshToken: String,
)

/** Endpoints de sesión. Se sirve con el cliente HTTP "auth" (sin Bearer automático ni Authenticator). */
interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    /** Alta del alumno con el token de su invitación. Devuelve la sesión, igual que el login. */
    @POST("students")
    suspend fun registerStudent(@Body body: RegisterStudentRequest): RegisterStudentResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): RefreshResponse

    @POST("auth/logout")
    suspend fun logout(@Header("Authorization") bearer: String, @Body body: RefreshRequest): Response<Unit>
}
