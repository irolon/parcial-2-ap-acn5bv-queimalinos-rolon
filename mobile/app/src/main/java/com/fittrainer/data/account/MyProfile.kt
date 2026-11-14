package com.fittrainer.data.account

import com.fittrainer.data.api.account.ProfileDto
import com.fittrainer.data.db.account.MyProfileEntity
import com.fittrainer.data.session.Role
import java.time.Instant

/** El perfil propio tal como está en Room. [avatarUrl] es una URL firmada que vence en una hora. */
data class MyProfile(
    val role: Role,
    val name: String,
    val email: String,
    val phone: String?,
    val avatarUrl: String?,
    val professionalTitle: String?,
    val fetchedAt: Instant,
)

/** Campos que se pueden mandar en el PATCH del perfil (los del backend). */
enum class ProfileField(val wire: String) { NAME("name"), PHONE("phone"), TITLE("professional_title") }

/** 400 con errores por campo (`details[].field`): el mensaje de cada campo, y el general si no vino ninguno. */
class FieldErrorsException(val fields: Map<String, String>, message: String?) : Exception(message)

/** 413 o 415: la foto no sirve; [message] es el texto para el usuario. */
class AvatarRejectedException(message: String) : Exception(message)

const val AVATAR_TOO_LARGE = "La foto supera los 5 MB"
const val AVATAR_TYPE_INVALID = "Usá una foto JPG, PNG o WebP"

internal fun MyProfileEntity.toDomain() = MyProfile(
    role = Role.valueOf(role),
    name = name,
    email = email,
    phone = phone,
    avatarUrl = avatarUrl,
    professionalTitle = professionalTitle,
    fetchedAt = Instant.ofEpochMilli(fetchedAt),
)

internal fun ProfileDto.toEntity(ownerId: String, role: Role, now: Long) = MyProfileEntity(
    ownerId = ownerId,
    role = role.name,
    name = name,
    email = email,
    phone = phone,
    // El entrenador no tiene foto propia todavía (fuera de la #95): se ignora lo que venga.
    avatarUrl = if (role == Role.STUDENT) avatarUrl else null,
    professionalTitle = if (role == Role.TRAINER) professionalTitle else null,
    fetchedAt = now,
)

/** Lado mayor de la foto de perfil al subirla (GX2: la web también la achica a 512 px). */
const val AVATAR_MAX_SIDE = 512

/** La foto elegida (uri en texto), achicada a [AVATAR_MAX_SIDE] en JPEG; null si no se pudo leer. */
fun interface AvatarReader {
    suspend fun jpeg(uri: String): ByteArray?
}
