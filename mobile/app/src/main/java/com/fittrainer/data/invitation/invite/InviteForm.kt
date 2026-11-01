package com.fittrainer.data.invitation.invite

import com.fittrainer.data.api.invitation.CreateInvitationRequest

/** Campos del formulario "Invitar alumno". */
enum class InviteField { NAME, EMAIL, GOAL, LEVEL, PHONE, EQUIPMENT, INJURIES }

/** Lo que escribió el entrenador, tal cual (los opcionales vacíos son ""/null). */
data class InviteForm(
    val name: String = "",
    val email: String = "",
    val goal: String? = null,
    val level: String? = null,
    val phone: String = "",
    val equipment: List<String> = emptyList(),
    val injuries: String = "",
)

val GOALS = listOf("tonify", "weight_loss", "hypertrophy", "strength")
val LEVELS = listOf("beginner", "intermediate", "advanced")
const val MAX_EQUIPMENT = 30
const val MAX_EQUIPMENT_LENGTH = 50
const val MAX_INJURIES = 1000
private const val MIN_PHONE_DIGITS = 8
private val EMAIL_RE = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

private fun phoneDigits(phone: String) = phone.filter(Char::isDigit)

/** Las mismas reglas que el backend (validations/invitations). Vacío = válido. */
fun InviteForm.errors(): Map<InviteField, String> = buildMap {
    val n = name.trim()
    if (n.length !in 2..100) put(InviteField.NAME, "Entre 2 y 100 caracteres")
    if (!EMAIL_RE.matches(email.trim())) put(InviteField.EMAIL, "Email inválido")
    if (goal != null && goal !in GOALS) put(InviteField.GOAL, "Objetivo inválido")
    if (level != null && level !in LEVELS) put(InviteField.LEVEL, "Nivel inválido")
    if (phone.isNotBlank() && phoneDigits(phone).length < MIN_PHONE_DIGITS) {
        put(InviteField.PHONE, "Teléfono con al menos $MIN_PHONE_DIGITS dígitos")
    }
    val items = equipment.map { it.trim() }
    when {
        items.size > MAX_EQUIPMENT -> put(InviteField.EQUIPMENT, "Hasta $MAX_EQUIPMENT elementos")
        items.any { it.length !in 1..MAX_EQUIPMENT_LENGTH } ->
            put(InviteField.EQUIPMENT, "Cada elemento de 1 a $MAX_EQUIPMENT_LENGTH caracteres")
    }
    if (injuries.trim().length > MAX_INJURIES) put(InviteField.INJURIES, "Hasta $MAX_INJURIES caracteres")
}

/** Con teléfono va por los dos canales ("both"); sin teléfono, solo QR. Vacíos → null. */
fun InviteForm.toRequest(): CreateInvitationRequest {
    val digits = phoneDigits(phone)
    return CreateInvitationRequest(
        studentName = name.trim(),
        studentEmail = email.trim(),
        studentPhone = digits.ifEmpty { null },
        goal = goal?.takeIf { it.isNotBlank() },
        level = level?.takeIf { it.isNotBlank() },
        gymEquipment = equipment.map { it.trim() }.filter { it.isNotEmpty() }.ifEmpty { null },
        injuries = injuries.trim().ifEmpty { null },
        deliveryChannel = if (digits.isEmpty()) "qr" else "both",
    )
}

/** Campo del backend (details[].field) → campo del formulario. */
fun inviteFieldOf(apiField: String?): InviteField? = when (apiField) {
    "student_name" -> InviteField.NAME
    "student_email" -> InviteField.EMAIL
    "goal" -> InviteField.GOAL
    "level" -> InviteField.LEVEL
    "student_phone", "delivery_channel" -> InviteField.PHONE
    "gym_equipment" -> InviteField.EQUIPMENT
    "injuries" -> InviteField.INJURIES
    else -> null
}
