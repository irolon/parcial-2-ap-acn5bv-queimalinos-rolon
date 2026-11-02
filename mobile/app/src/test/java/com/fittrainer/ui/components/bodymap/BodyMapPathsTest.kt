package com.fittrainer.ui.components.bodymap

import androidx.compose.ui.graphics.vector.PathParser
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

class BodyMapPathsTest {
    // El directorio de trabajo de los unit tests es app/.
    private fun asset(): String = File("src/main/assets/$BODY_MAP_ASSET").readText()

    @Test fun `todos los trazos y contornos del dibujo real parsean sin lanzar`() {
        val data = parseBodyMap(asset())!!
        var count = 0
        BodyView.entries.map { data.view(it) }.forEach { view ->
            PathParser().parsePathString(view.outline)
            count++
            view.parts.flatMap { it.paths }.forEach {
                PathParser().parsePathString(it)
                count++
            }
        }
        assertTrue("se esperaban trazos, hubo $count", count > 10)
    }
}
