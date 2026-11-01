package com.fittrainer.ui.exercises.trainer.form

import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.ui.components.exercise.equipmentLabel
import kotlinx.serialization.json.JsonNull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseFormTest {

    private val before = TrainerExercise("e1", "Curl martillo", "biceps", "dumbbell", "Codos pegados", "https://youtu.be/x", isGlobal = false)
    private val valid = ExerciseFormInput("Curl E2E", "biceps", "dumbbell", "", "")

    @Test fun `valido sin opcionales`() {
        assertTrue(valid.copy(equipment = null).errors().isEmpty())
    }

    @Test fun `nombre corto y sin grupo son error`() {
        assertEquals(setOf(ExerciseFormField.NAME, ExerciseFormField.MUSCLE_GROUP), ExerciseFormInput("C").errors().keys)
    }

    @Test fun `descripcion de 1001 caracteres es error`() {
        assertTrue(ExerciseFormField.DESCRIPTION in valid.copy(description = "d".repeat(1001)).errors())
    }

    @Test fun `urls de video`() {
        assertTrue(isVideoUrl("https://youtu.be/abc"))
        assertTrue(isVideoUrl("HTTP://example.com"))
        assertFalse(isVideoUrl("www.youtube.com/watch"))
        assertFalse(isVideoUrl("ftp://x.com/v"))
        assertFalse(isVideoUrl("https://"))
        assertFalse(isVideoUrl("https://you tube.com"))
        assertFalse(isVideoUrl("https://x.com/" + "a".repeat(490)))
        assertTrue(ExerciseFormField.VIDEO_URL in valid.copy(videoUrl = "youtube.com").errors())
    }

    @Test fun `el alta no manda los opcionales vacios`() {
        assertEquals("""{"name":"Curl E2E","muscle_group":"biceps","equipment":"dumbbell"}""", valid.copy(name = " Curl E2E ").toCreateBody().toString())
    }

    @Test fun `editar sin cambios no hay patch`() {
        assertNull(before.toFormInput().patch(before))
    }

    @Test fun `vaciar descripcion y video manda null y lo que no cambio no va`() {
        val patch = before.toFormInput().copy(description = " ", videoUrl = "").patch(before)!!
        assertEquals(setOf("description", "video_url"), patch.keys)
        assertEquals(JsonNull, patch["description"])
    }

    @Test fun `quitar el equipo manda null`() {
        assertEquals("""{"equipment":null}""", before.toFormInput().copy(equipment = null).patch(before)!!.toString())
    }

    @Test fun `etiquetas del equipo`() {
        assertEquals("Mancuernas", equipmentLabel("dumbbell"))
        assertEquals("Peso corporal", equipmentLabel("bodyweight"))
        assertEquals("rueda", equipmentLabel("rueda"))
    }
}
