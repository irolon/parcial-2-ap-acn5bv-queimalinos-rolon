package com.fittrainer.data.progress.chartmath

import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.defaultExerciseId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** El que viene elegido en Cargas: el más reciente con curva (2+ días); si ninguno tiene, el más reciente. */
class DefaultExerciseTest {
    private fun t(id: String, days: Int) = TrainedExercise(id, id, days, "2026-11-01")

    @Test fun saltaElMasRecienteSiTieneUnSoloDia() {
        // Galaxy S10 de Igna, 11/11: Curl femoral (1 día) tapaba a Press banca (6 días) y no se veía ninguna curva.
        assertEquals("press", defaultExerciseId(listOf(t("curl", 1), t("gemelos", 1), t("press", 6), t("remo", 3))))
    }

    @Test fun elMasRecienteSiYaTieneCurva() {
        assertEquals("curl", defaultExerciseId(listOf(t("curl", 2), t("press", 6))))
    }

    @Test fun sinNingunoConCurvaElMasReciente() {
        assertEquals("curl", defaultExerciseId(listOf(t("curl", 1), t("press", 1))))
    }

    @Test fun listaVaciaNada() {
        assertNull(defaultExerciseId(emptyList()))
    }
}
