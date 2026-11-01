package com.fittrainer.ui.routines.trainer.picker

import com.fittrainer.data.exercises.trainer.TrainerExercise
import org.junit.Assert.assertEquals
import org.junit.Test

class CatalogPickerTest {

    private fun exercise(id: String, name: String, group: String?) = TrainerExercise(id, name, group, null, null, null, true)

    private val all = listOf(
        exercise("1", "Press de banca", "chest"),
        exercise("2", "Remo con barra", "back"),
        exercise("3", "Elevación lateral", "shoulders"),
        exercise("4", "Press militar", "shoulders"),
    )

    @Test fun `todas las palabras, sin tildes ni mayusculas`() {
        assertEquals(listOf("1"), filterExercises(all, "press BANCA", null).map { it.id })
        assertEquals(listOf("3"), filterExercises(all, "elevacion", null).map { it.id })
    }

    @Test fun `el grupo filtra y se combina con el texto`() {
        assertEquals(listOf("3", "4"), filterExercises(all, "", "shoulders").map { it.id })
        assertEquals(listOf("4"), filterExercises(all, "press", "shoulders").map { it.id })
    }

    @Test fun `sin filtros devuelve todo`() {
        assertEquals(4, filterExercises(all, "  ", null).size)
    }

    @Test fun `grupos en el orden de la biblioteca`() {
        assertEquals(listOf("chest", "back", "shoulders"), availableGroups(all))
    }
}
