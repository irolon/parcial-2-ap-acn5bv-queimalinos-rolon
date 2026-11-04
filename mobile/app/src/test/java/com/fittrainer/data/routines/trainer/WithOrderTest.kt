package com.fittrainer.data.routines.trainer

import com.fittrainer.data.db.routines.trainer.TrainerRoutineExerciseEntity
import org.junit.Assert.assertEquals
import org.junit.Test

class WithOrderTest {

    private fun e(id: String, order: Int) = TrainerRoutineExerciseEntity(
        trainerId = "t1", id = id, routineId = "r1", exerciseId = "x$id", name = id, muscleGroup = null, equipment = null,
        sets = 3, reps = 10, restSeconds = null, suggestedKg = null, tempo = null, notes = null, orderIndex = order,
    )

    @Test fun `aplica el orden pedido y renumera`() {
        val out = listOf(e("a", 0), e("b", 1), e("c", 2)).withOrder(listOf("c", "a", "b"))
        assertEquals(listOf("c" to 0, "a" to 1, "b" to 2), out.map { it.id to it.orderIndex })
    }

    @Test fun `los que no estan en el pedido van al final en su orden`() {
        val out = listOf(e("a", 0), e("b", 1), e("n", 2)).withOrder(listOf("b", "a"))
        assertEquals(listOf("b", "a", "n"), out.map { it.id })
    }
}
