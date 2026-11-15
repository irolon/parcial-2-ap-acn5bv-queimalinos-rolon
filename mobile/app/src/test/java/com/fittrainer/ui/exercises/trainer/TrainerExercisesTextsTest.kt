package com.fittrainer.ui.exercises.trainer

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.ui.routines.trainer.ACTION_FAILED
import org.junit.Assert.assertEquals
import org.junit.Test

class TrainerExercisesTextsTest {

    @Test fun `la confirmacion de borrado avisa que uno en uso se archiva, como la web`() {
        assertEquals(
            "¿Eliminar \"Curl\"? Si está en una rutina o en el historial de un alumno, lo archivamos: sale de la " +
                "biblioteca, pero las rutinas y sesiones viejas lo siguen mostrando.",
            deleteQuestion("Curl"),
        )
    }

    @Test fun `un 409 ya no tiene mensaje propio y cae en el generico`() {
        val conflict = DataException(DataError.Http(409), RuntimeException())
        assertEquals(ACTION_FAILED, conflict.exerciseActionMessage())
    }
}
