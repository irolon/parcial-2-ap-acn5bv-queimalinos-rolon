package com.fittrainer.data.library

import com.fittrainer.testing.fakes.library.libraryDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LibraryMapperTest {

    @Test fun `la posicion es el orden en que llego del backend`() {
        val entities = listOf(libraryDto("b"), libraryDto("a")).toEntities()
        assertEquals(listOf("b" to 0, "a" to 1), entities.map { it.id to it.position })
    }

    @Test fun `entidad a dominio conserva todos los campos`() {
        val exercise = listOf(libraryDto("ex-1", video = "https://v")).toEntities().single().toDomain()
        assertEquals(
            LibraryExercise("ex-1", "Ejercicio ex-1", "chest", "Barra", "Desc ex-1", "https://v"),
            exercise,
        )
    }

    // Review Focus 3: un PATCH con "" deja el video en blanco; no se ofrece un link roto.
    @Test fun `video en blanco se guarda como null`() {
        assertNull(listOf(libraryDto(video = "  ")).toEntities().single().videoUrl)
    }
}
