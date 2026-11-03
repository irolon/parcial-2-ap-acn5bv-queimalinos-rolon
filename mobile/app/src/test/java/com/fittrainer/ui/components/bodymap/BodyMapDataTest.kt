package com.fittrainer.ui.components.bodymap

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BodyMapDataTest {
    // El directorio de trabajo de los unit tests es app/.
    private fun asset(): String = File("src/main/assets/$BODY_MAP_ASSET").readText()

    @Test fun `el json del dibujo trae las dos vistas`() {
        val data = parseBodyMap(asset())!!
        assertEquals(listOf(30f, 90f, 670f, 1280f), data.view(BodyView.FRONT).viewBox)
        assertEquals(listOf(754f, 90f, 670f, 1280f), data.view(BodyView.BACK).viewBox)
        assertTrue(data.view(BodyView.FRONT).outline.startsWith("M"))
        assertTrue(data.view(BodyView.FRONT).parts.any { it.slug == "chest" && it.paths.isNotEmpty() })
        assertTrue(data.view(BodyView.BACK).parts.any { it.slug == "gluteal" })
    }

    @Test fun `json roto o sin una vista no rompe`() {
        assertNull(parseBodyMap("no es json"))
        assertNull(parseBodyMap("""{"views":{"front":{"viewBox":[0,0,1,1],"outline":"M0 0","parts":[]}}}"""))
    }

    @Test fun `un viewBox que no tiene cuatro valores es invalido`() {
        fun view(box: String) = """{"viewBox":$box,"outline":"M0 0","parts":[]}"""
        assertNull(parseBodyMap("""{"views":{"front":${view("[0,0,1]")},"back":${view("[0,0,1,1]")}}}"""))
        assertNull(parseBodyMap("""{"views":{"front":${view("[0,0,1,1]")},"back":${view("[0,0,1,1,2]")}}}"""))
    }

    @Test fun `toda parte nombrada existe en el dibujo y las no neutras son ALL_MUSCLE_PARTS`() {
        val data = parseBodyMap(asset())!!
        val slugs = BodyView.entries.flatMap { v -> data.view(v).parts.map { it.slug } }.toSet()
        assertEquals(ALL_MUSCLE_PARTS, slugs - NEUTRAL_PARTS)
    }

    @Test fun `la miniatura usa la vista con mas musculo pintado`() {
        val data = parseBodyMap(asset())!!
        assertEquals(BodyView.BACK, busiestView(data, partsFor("back") + partsFor("glutes")))
        assertEquals(BodyView.FRONT, busiestView(data, partsFor("chest")))
        assertEquals(BodyView.FRONT, busiestView(data, partsFor("triceps"))) // está en las dos: empate
    }
}
