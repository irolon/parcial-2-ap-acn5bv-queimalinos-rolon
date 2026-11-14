package com.fittrainer.data.account

/*
 * Las reglas del backend para el perfil (GX2 #95) y la contraseña (GX1 #94), para avisar antes de enviar. El backend
 * las vuelve a validar: si no coinciden, su 400 llega por campo igual.
 */

const val NAME_ERROR = "El nombre tiene que tener entre 2 y 100 caracteres"
const val PHONE_ERROR = "Usá solo números, espacios y + - ( ), con al menos 6 dígitos"
const val TITLE_ERROR = "El título tiene que tener entre 2 y 80 caracteres"
const val PASSWORD_RULES_ERROR = "Al menos 8 caracteres, con una mayúscula y un número"
const val PASSWORD_SAME_ERROR = "Tiene que ser distinta de la actual"
const val REPEAT_ERROR = "No coincide con la nueva"
const val CURRENT_REQUIRED_ERROR = "Escribí tu contraseña actual"

private val PHONE_CHARS = Regex("^[0-9 +()-]{6,30}$")
private const val PHONE_MIN_DIGITS = 6
private const val PASSWORD_MIN = 8

/** Recortado; vacío es null (borrar el dato). */
fun blankToNull(value: String): String? = value.trim().ifEmpty { null }

fun nameError(name: String): String? = if (name.trim().length in 2..100) null else NAME_ERROR

/** Vacío está bien (lo borra). */
fun phoneError(phone: String): String? {
    val value = phone.trim()
    if (value.isEmpty()) return null
    return if (PHONE_CHARS.matches(value) && value.count(Char::isDigit) >= PHONE_MIN_DIGITS) null else PHONE_ERROR
}

/** Vacío está bien (lo borra). */
fun titleError(title: String): String? {
    val value = title.trim()
    return if (value.isEmpty() || value.length in 2..80) null else TITLE_ERROR
}

fun newPasswordError(current: String, new: String): String? = when {
    // Como el backend: [A-Z] y [0-9] (una Ñ sola no cuenta como mayúscula).
    new.length < PASSWORD_MIN || new.none { it in 'A'..'Z' } || new.none { it in '0'..'9' } -> PASSWORD_RULES_ERROR
    new == current -> PASSWORD_SAME_ERROR
    else -> null
}

fun repeatError(new: String, repeat: String): String? = if (new == repeat) null else REPEAT_ERROR
