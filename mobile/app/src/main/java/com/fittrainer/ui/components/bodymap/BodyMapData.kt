package com.fittrainer.ui.components.bodymap

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Ruta del dibujo del cuerpo dentro de los assets de la app. */
const val BODY_MAP_ASSET = "body_map/body_map.json"

@Serializable
data class BodyMapData(val views: Map<String, BodyViewData>)

@Serializable
data class BodyViewData(
    val viewBox: List<Float>,
    val outline: String,
    val parts: List<BodyPartData>,
)

@Serializable
data class BodyPartData(val slug: String, val paths: List<String>)

enum class BodyView(val key: String) {
    FRONT("front"),
    BACK("back"),
}

private val bodyMapJson = Json { ignoreUnknownKeys = true }

/** Parsea el JSON del dibujo; null si está roto, le falta el frente o la espalda o un viewBox no tiene 4 valores. */
fun parseBodyMap(json: String): BodyMapData? {
    val data = try {
        bodyMapJson.decodeFromString<BodyMapData>(json)
    } catch (e: Exception) {
        return null
    }
    return data.takeIf { d ->
        BodyView.entries.all { it.key in d.views } && d.views.values.all { it.viewBox.size == 4 }
    }
}

/** Siempre existe si [parseBodyMap] no devolvió null. */
fun BodyMapData.view(v: BodyView): BodyViewData = views.getValue(v.key)
