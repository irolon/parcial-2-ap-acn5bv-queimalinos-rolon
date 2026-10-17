package com.fittrainer.ui.login

import com.fittrainer.MainDispatcherRule
import com.fittrainer.data.FakeAuthApi
import com.fittrainer.data.FakeTokenStore
import com.fittrainer.data.fixedClock
import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.httpError
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class LoginViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val vm = LoginViewModel(AuthRepository(api, store, fixedClock()))

    private fun fill(email: String = "ana@test.com", password: String = "Secreta123") {
        vm.onEmailChange(email)
        vm.onPasswordChange(password)
    }

    @Test fun `login ok guarda la sesion y termina de cargar`() = runTest {
        fill()
        vm.submit()
        assertNotNull(store.current())
        assertFalse(vm.uiState.value.isLoading)
        assertNull(vm.uiState.value.error)
    }

    // El ViewModel vive en la Activity: tras cerrar sesión el form no debe mostrar al usuario anterior.
    @Test fun `login ok limpia email y contraseña`() = runTest {
        fill()
        vm.submit()
        assertEquals("", vm.uiState.value.email)
        assertEquals("", vm.uiState.value.password)
    }

    @Test fun `email invalido no llama a la API`() = runTest {
        fill(email = "ana@")
        vm.submit()
        assertEquals("Email con formato inválido", vm.uiState.value.emailError)
        assertTrue(api.loginCalls.isEmpty())
    }

    // Review Focus 3: espacios alrededor del email no son error de formato.
    @Test fun `email con espacios se recorta antes de validar y enviar`() = runTest {
        fill(email = "  ana@test.com  ")
        vm.submit()
        assertNull(vm.uiState.value.emailError)
        assertEquals(LoginRequest("ana@test.com", "Secreta123"), api.loginCalls.single())
    }

    @Test fun `contraseña vacia no permite enviar`() = runTest {
        fill(password = "")
        assertFalse(vm.uiState.value.canSubmit)
        vm.submit()
        assertTrue(api.loginCalls.isEmpty())
    }

    @Test fun `mientras carga isLoading es true y un segundo submit se ignora`() = runTest {
        api.loginGate = CompletableDeferred()
        fill()
        vm.submit()
        assertTrue(vm.uiState.value.isLoading)
        assertFalse(vm.uiState.value.canSubmit)

        vm.submit()
        api.loginGate?.complete(Unit)

        assertEquals(1, api.loginCalls.size)
        assertFalse(vm.uiState.value.isLoading)
    }

    @Test fun `401 muestra credenciales incorrectas`() = runTest {
        api.loginError = httpError(401)
        fill()
        vm.submit()
        assertEquals("Email o contraseña incorrectos", vm.uiState.value.error)
        assertFalse(vm.uiState.value.isLoading)
    }

    @Test fun `sin red muestra sin conexion`() = runTest {
        api.loginError = IOException("sin red")
        fill()
        vm.submit()
        assertEquals("Sin conexión con el servidor", vm.uiState.value.error)
    }

    // Review Focus 5: 400/500 → mensaje genérico, sin texto técnico.
    @Test fun `400 y 500 muestran el mensaje generico`() = runTest {
        fill()
        api.loginError = httpError(500)
        vm.submit()
        assertEquals("No se pudo iniciar sesión", vm.uiState.value.error)

        api.loginError = httpError(400)
        vm.submit()
        assertEquals("No se pudo iniciar sesión", vm.uiState.value.error)
    }

    // Review Focus 4: corregir un campo borra el error anterior.
    @Test fun `editar un campo limpia los errores`() = runTest {
        api.loginError = httpError(401)
        fill(email = "ana@")
        vm.submit()
        vm.onEmailChange("ana@test.com")
        assertNull(vm.uiState.value.emailError)

        vm.submit()
        assertNotNull(vm.uiState.value.error)
        vm.onPasswordChange("Otra1234")
        assertNull(vm.uiState.value.error)
    }
}
