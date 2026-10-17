package com.fittrainer.ui.join

import com.fittrainer.testing.fakes.TOKEN
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class JoinViewModelTest {

    private val vm = JoinViewModel()
    private val link = "http://localhost:5173/join?token=$TOKEN"

    @Test fun `pegar un link valido deja el token para navegar`() {
        vm.onLinkChange(link)
        vm.submitLink()
        assertEquals(TOKEN, vm.uiState.value.token)
        assertNull(vm.uiState.value.linkError)
    }

    @Test fun `pegar un link invalido muestra el error y no navega`() {
        vm.onLinkChange("hola")
        vm.submitLink()
        assertEquals("Este código no es una invitación de FitTrainer", vm.uiState.value.linkError)
        assertNull(vm.uiState.value.token)
    }

    @Test fun `editar el link borra el error`() {
        vm.onLinkChange("hola")
        vm.submitLink()
        vm.onLinkChange("hola2")
        assertNull(vm.uiState.value.linkError)
    }

    @Test fun `qr invalido muestra el aviso y sigue escaneando`() {
        vm.onQrScanned("https://otra-app.com")
        assertEquals("Este código no es una invitación de FitTrainer", vm.uiState.value.scanError)
        assertNull(vm.uiState.value.token)
        vm.onQrScanned(link)
        assertEquals(TOKEN, vm.uiState.value.token)
        assertNull(vm.uiState.value.scanError)
    }

    // Review Focus 2: el analizador repite el mismo QR muchas veces por segundo.
    @Test fun `lecturas repetidas no reemplazan el token pendiente`() {
        val other = "11111111-2222-4333-8444-555555555555"
        vm.onQrScanned(link)
        vm.onQrScanned(link)
        vm.onQrScanned(other)
        assertEquals(TOKEN, vm.uiState.value.token)
    }

    @Test fun `despues de navegar se puede volver a escanear`() {
        vm.onQrScanned(link)
        vm.onNavigated()
        assertNull(vm.uiState.value.token)
    }
}
