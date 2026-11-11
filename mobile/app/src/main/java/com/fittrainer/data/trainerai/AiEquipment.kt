package com.fittrainer.data.trainerai

import java.text.Normalizer

/** Los códigos del catálogo, en el orden de EQUIPMENT del backend (exercise.model.js). */
val EQUIPMENT_CODES = listOf("barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "band")

/** Sinónimos (ya normalizados: minúsculas, sin acentos, en singular) → código del catálogo. */
private val SYNONYMS = mapOf(
    "mancuerna" to "dumbbell",
    "barra" to "barbell",
    "maquina" to "machine",
    "polea" to "cable",
    "pesa rusa" to "kettlebell",
    "banda" to "band",
    "banda elastica" to "band",
    "elastico" to "band",
    "peso corporal" to "bodyweight",
    "sin equipamiento" to "bodyweight",
)

private val MARKS = Regex("\\p{M}+")
private val SPACES = Regex("\\s+")

/** Minúsculas, sin acentos, espacios simples y cada palabra sin la "s" final del plural. */
private fun canonical(text: String): String =
    Normalizer.normalize(text, Normalizer.Form.NFD).replace(MARKS, "").lowercase().trim()
        .split(SPACES).joinToString(" ") { if (it.length > 3) it.removeSuffix("s") else it }

/** codes: del catálogo, sin repetir; unmapped: los textos que no se pudieron mapear (como se cargaron, sin repetir). */
data class AiEquipment(val codes: List<String>, val unmapped: List<String>)

/**
 * El equipamiento de la ficha (texto libre: "Agregar otro", invitaciones) llevado al catálogo, igual que
 * `normalizeEquipment` del backend (models/exercises/equipment.model.js) y de la web.
 */
fun normalizeEquipment(values: List<String>?): AiEquipment {
    val codes = linkedSetOf<String>()
    val unmapped = linkedMapOf<String, String>()
    values.orEmpty().filter { it.isNotBlank() }.forEach { value ->
        val key = canonical(value)
        val code = key.takeIf { it in EQUIPMENT_CODES } ?: SYNONYMS[key]
        if (code != null) codes += code else unmapped.putIfAbsent(key, value.trim())
    }
    return AiEquipment(codes.toList(), unmapped.values.toList())
}

/** Lo que no mapea, como lo suma el backend a las preferencias (null si no hay nada). */
fun extraEquipmentNote(unmapped: List<String>): String? =
    unmapped.takeIf { it.isNotEmpty() }?.let { "Equipamiento extra del gimnasio: ${it.joinToString(", ")}" }
