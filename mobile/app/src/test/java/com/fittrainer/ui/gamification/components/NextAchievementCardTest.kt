package com.fittrainer.ui.gamification.components

import com.fittrainer.ui.gamification.MedalUi
import org.junit.Assert.assertEquals
import org.junit.Test

class NextAchievementCardTest {
    private val medal = MedalUi("S10", "10 sesiones", null, "milestone", false, null, "6/10", 0.6f, true)

    @Test fun desbloqueadosEnSingularYPlural() {
        assertEquals("Todavía no desbloqueaste logros", unlockedLabel(0))
        assertEquals("Tenés 1 desbloqueado", unlockedLabel(1))
        assertEquals("Tenés 3 desbloqueados", unlockedLabel(3))
    }

    @Test fun descripcionParaTalkBackConYSinProximoLogro() {
        assertEquals("Próximo logro: 10 sesiones, 6/10. Tenés 3 desbloqueados. Ver logros", nextAchievementDescription(medal, unlockedLabel(3)))
        assertEquals("Tenés 3 desbloqueados. Ver logros", nextAchievementDescription(null, unlockedLabel(3)))
    }
}
