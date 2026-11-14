package com.fittrainer.testing.fakes.account

import com.fittrainer.data.api.account.AvatarDto
import com.fittrainer.data.api.account.AvatarResponse
import com.fittrainer.data.api.account.ChangePasswordRequest
import com.fittrainer.data.api.account.ChangePasswordResponse
import com.fittrainer.data.api.account.ProfileApi
import com.fittrainer.data.api.account.ProfileDto
import com.fittrainer.data.api.account.ProfileResponse
import com.fittrainer.data.auth.RequiredUser
import kotlinx.coroutines.CompletableDeferred
import kotlinx.serialization.json.JsonObject
import okhttp3.MultipartBody
import retrofit2.Response

/** ProfileApi en memoria: [error] hace fallar el próximo pedido; los bodies quedan para mirar. */
class FakeProfileApi(
    var student: ProfileDto = ProfileDto("u1", "Ana", "ana@test.com", phone = "11 5555 5555", avatarUrl = "https://x/a.jpg?sig=1"),
    var trainer: ProfileDto = ProfileDto("t1", "Profe", "profe@test.com", professionalTitle = "Lic. en Ed. Física", avatarUrl = "https://x/t.jpg"),
) : ProfileApi {
    var error: Exception? = null
    val patches = mutableListOf<JsonObject>()
    val passwords = mutableListOf<ChangePasswordRequest>()
    val owners = mutableListOf<RequiredUser>()
    var uploads = 0
    var removes = 0
    var avatarUrl: String? = "https://x/nueva.jpg?sig=2"
    var newToken = "access-nuevo"
    /** Si está puesto, el GET del perfil no responde hasta que se complete. */
    var gate: CompletableDeferred<Unit>? = null
    /** Si están puestos, el PATCH del alumno o la subida de la foto no responden hasta que se completen. */
    var patchGate: CompletableDeferred<Unit>? = null
    var avatarGate: CompletableDeferred<Unit>? = null

    private fun check(owner: RequiredUser) {
        owners += owner
        error?.let { error = null; throw it }
    }

    override suspend fun studentMe(owner: RequiredUser, id: String): ProfileResponse {
        check(owner)
        gate?.await()
        return ProfileResponse(student)
    }

    override suspend fun updateStudent(owner: RequiredUser, id: String, body: JsonObject): ProfileResponse {
        check(owner)
        patchGate?.await()
        patches += body
        student = apply(student, body)
        return ProfileResponse(student)
    }

    override suspend fun setAvatar(owner: RequiredUser, id: String, image: MultipartBody.Part): AvatarResponse {
        check(owner)
        avatarGate?.await()
        uploads++
        return AvatarResponse(AvatarDto(avatarUrl))
    }

    override suspend fun removeAvatar(owner: RequiredUser, id: String): Response<Unit> {
        check(owner)
        removes++
        return Response.success(204, Unit)
    }

    override suspend fun trainerMe(owner: RequiredUser) = check(owner).let { ProfileResponse(trainer) }

    override suspend fun updateTrainer(owner: RequiredUser, body: JsonObject): ProfileResponse {
        check(owner)
        patches += body
        trainer = apply(trainer, body)
        return ProfileResponse(trainer)
    }

    override suspend fun changePassword(owner: RequiredUser, body: ChangePasswordRequest): ChangePasswordResponse {
        check(owner)
        passwords += body
        return ChangePasswordResponse(newToken)
    }

    private fun apply(dto: ProfileDto, body: JsonObject): ProfileDto {
        fun value(key: String, old: String?): String? =
            if (key in body) body[key].toString().trim('"').takeUnless { it == "null" } else old
        return dto.copy(
            name = value("name", dto.name) ?: dto.name,
            phone = value("phone", dto.phone),
            professionalTitle = value("professional_title", dto.professionalTitle),
        )
    }
}
