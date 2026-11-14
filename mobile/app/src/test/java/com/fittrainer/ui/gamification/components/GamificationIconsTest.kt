package com.fittrainer.ui.gamification.components

import androidx.compose.ui.graphics.vector.VectorPath
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class GamificationIconsTest {
    @Test
    fun `cada categoría tiene su ícono y lo desconocido cae en la bandera`() {
        assertSame(GamificationIcons.Fire, categoryIcon("streak"))
        assertSame(GamificationIcons.Trophy, categoryIcon("pr"))
        assertSame(GamificationIcons.Calendar, categoryIcon("consistency"))
        assertSame(GamificationIcons.Flag, categoryIcon("milestone"))
        assertSame(GamificationIcons.Flag, categoryIcon(null))
    }

    @Test
    fun `los cuatro íconos se arman en 24x24 con sus trazos parseados`() {
        val expectedPaths = mapOf(
            GamificationIcons.Fire to 2,
            GamificationIcons.Trophy to 1,
            GamificationIcons.Calendar to 1,
            GamificationIcons.Flag to 1,
        )
        expectedPaths.forEach { (icon, count) ->
            assertEquals(24f, icon.viewportWidth)
            assertEquals(24f, icon.viewportHeight)
            val paths = (0 until icon.root.size).map { icon.root[it] }.filterIsInstance<VectorPath>()
            assertEquals(icon.name, count, paths.size)
            assertTrue(icon.name, paths.all { it.pathData.size > 3 })
        }
    }
}
