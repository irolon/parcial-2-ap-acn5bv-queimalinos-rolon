package com.fittrainer.ui.library

import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.library.LibraryExercise
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LibraryUiStateTest {

    private fun ex(id: String, muscle: String?) = LibraryExercise(id, "Ej $id", muscle, null, null, null)
    private fun cache(vararg e: LibraryExercise) = LibraryCache(e.toList(), Instant.EPOCH)

    @Test fun `solo hay chips de los grupos con ejercicios, en el orden del backend`() {
        assertEquals(listOf("chest", "legs"), availableGroups(listOf(ex("1", "legs"), ex("2", "chest"), ex("3", "legs"))))
    }

    // Review Focus 2: un grupo que el backend no tiene en su lista no rompe el filtro.
    @Test fun `grupos desconocidos van al final ordenados`() {
        assertEquals(
            listOf("back", "aductores", "zancadas"),
            availableGroups(listOf(ex("1", "zancadas"), ex("2", "back"), ex("3", "aductores"), ex("4", null))),
        )
    }

    @Test fun `filtra por el grupo elegido`() {
        val state = libraryUiState(cache(ex("1", "chest"), ex("2", "legs")), "legs", true, false, null)
        assertEquals("legs", state.selectedGroup)
        assertEquals(listOf("2"), state.exercises.map { it.id })
    }

    // Review Focus 4: el grupo elegido ya no existe después de un refresh → vuelve a "Todos".
    @Test fun `si el grupo elegido desaparece vuelve a Todos`() {
        val state = libraryUiState(cache(ex("1", "chest")), "legs", true, false, null)
        assertNull(state.selectedGroup)
        assertEquals(listOf("1"), state.exercises.map { it.id })
    }

    @Test fun `antes de leer Room no esta cargado`() {
        assertFalse(libraryUiState(null, null, true, false, null).loaded)
    }

    @Test fun `nunca sincronizo y biblioteca vacia son estados distintos`() {
        val never = libraryUiState(LibraryCache(emptyList(), null), null, false, false, null)
        assertFalse(never.everSynced)
        assertTrue(never.isOffline)

        val empty = libraryUiState(cache(), null, true, false, null)
        assertTrue(empty.everSynced)
        assertTrue(empty.isEmpty)
    }

    @Test fun `subtitulo con grupo y equipo sin separadores colgando`() {
        assertEquals("Pecho · Barra", librarySubtitle(LibraryExercise("1", "P", "chest", "Barra", null, null)))
        assertEquals("Barra", librarySubtitle(LibraryExercise("1", "P", null, "Barra", null, null)))
        assertEquals("", librarySubtitle(LibraryExercise("1", "P", null, null, null, null)))
    }

    @Test fun `el detalle de la biblioteca lleva descripcion y no prescripcion`() {
        val detail = LibraryExercise("1", "Press", "chest", "Barra", "Bajá controlado", "https://v").toDetail()
        assertEquals("Bajá controlado", detail.description)
        assertEquals("https://v", detail.videoUrl)
        assertNull(detail.sets)
        assertNull(detail.notes)
    }

    private val neverSynced = LibraryCache(emptyList(), null)

    @Test fun `nunca sincronizo y sin red pide conectarse`() {
        assertEquals(FirstLoadCard.Connect, libraryUiState(neverSynced, null, false, false, null).firstLoad)
    }

    @Test fun `nunca sincronizo con red y pedido en curso no muestra tarjeta`() {
        assertNull(libraryUiState(neverSynced, null, true, true, null).firstLoad)
    }

    @Test fun `nunca sincronizo con red y sin pedido en curso ofrece reintentar`() {
        assertEquals(FirstLoadCard.Retry, libraryUiState(neverSynced, null, true, false, null).firstLoad)
    }

    @Test fun `sin biblioteca que mostrar no hay aviso de ultima biblioteca`() {
        assertNull(libraryUiState(neverSynced, null, true, false, LIBRARY_REFRESH_FAILED).notice)
        assertEquals(LIBRARY_REFRESH_FAILED, libraryUiState(cache(), null, true, false, LIBRARY_REFRESH_FAILED).notice)
    }
}
