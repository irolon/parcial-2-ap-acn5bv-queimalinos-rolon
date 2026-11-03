package com.fittrainer.ui.components.bodymap

import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.vector.PathParser

/** Una parte lista para dibujar: sus trazos ya fusionados en un solo Path. */
class ParsedPart(val slug: String, val path: Path)

/** Una vista ya parseada; [viewBox] siempre tiene 4 valores (x, y, ancho, alto). */
class ParsedView(val viewBox: List<Float>, val outline: Path, val parts: List<ParsedPart>) {
    val width: Float get() = viewBox[2]
    val height: Float get() = viewBox[3]
}

/** El dibujo entero parseado una sola vez; [data] queda para consultas como [busiestView]. */
class ParsedBody(val data: BodyMapData, private val views: Map<String, ParsedView>) {
    fun view(v: BodyView): ParsedView = views.getValue(v.key)
}

private fun parsePath(d: String): Path = PathParser().parsePathString(d).toPath()

private fun parseView(view: BodyViewData): ParsedView = ParsedView(
    viewBox = view.viewBox,
    outline = parsePath(view.outline),
    parts = view.parts.map { part ->
        val merged = Path()
        part.paths.forEach { merged.addPath(parsePath(it)) }
        ParsedPart(part.slug, merged)
    },
)

/** Convierte todos los trazos a Path; lanza si alguno está mal (el que llama decide qué hacer). */
fun parseBody(data: BodyMapData): ParsedBody =
    ParsedBody(data, BodyView.entries.associate { it.key to parseView(data.view(it)) })
