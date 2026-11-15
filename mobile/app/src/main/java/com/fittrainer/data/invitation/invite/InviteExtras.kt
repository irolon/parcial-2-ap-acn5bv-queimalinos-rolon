package com.fittrainer.data.invitation.invite

import java.time.LocalDate

/*
 * Datos extra al invitar (#123): frecuencia, altura, peso y fecha de nacimiento. Todos opcionales; las mismas
 * reglas que el backend (validations/invitations/invitation-extras.validation.js). Al alta, la frecuencia y el
 * nacimiento pasan al alumno y la altura y el peso son su primera medida.
 */

val HEIGHT_CM_RANGE = 50.0..250.0
val WEIGHT_KG_RANGE = 20.0..300.0
val WEEKLY_FREQUENCY_RANGE = 1..7
private val MIN_BIRTH_DATE: LocalDate = LocalDate.of(1900, 1, 1)

/** Número escrito por el PT (acepta coma decimal). null si está vacío; NaN si no se entiende (lo marca la validación). */
internal fun decimalOrNull(text: String): Double? {
    val t = text.trim()
    if (t.isEmpty()) return null
    return t.replace(',', '.').toDoubleOrNull() ?: Double.NaN
}

private fun outOf(value: Double?, range: ClosedFloatingPointRange<Double>) = value != null && (value.isNaN() || value !in range)

/** Errores de los datos extra (se suman a los del resto del formulario). */
internal fun InviteForm.extrasErrors(today: LocalDate): Map<InviteField, String> = buildMap {
    if (weeklyFrequency != null && weeklyFrequency !in WEEKLY_FREQUENCY_RANGE) put(InviteField.FREQUENCY, "Entre 1 y 7 días")
    if (outOf(decimalOrNull(height), HEIGHT_CM_RANGE)) put(InviteField.HEIGHT, "Entre 50 y 250 cm")
    if (outOf(decimalOrNull(weight), WEIGHT_KG_RANGE)) put(InviteField.WEIGHT, "Entre 20 y 300 kg")
    when {
        birthDate == null -> Unit
        birthDate.isAfter(today) -> put(InviteField.BIRTH_DATE, "No puede ser una fecha futura")
        birthDate.isBefore(MIN_BIRTH_DATE) -> put(InviteField.BIRTH_DATE, "Desde 1900")
    }
}
