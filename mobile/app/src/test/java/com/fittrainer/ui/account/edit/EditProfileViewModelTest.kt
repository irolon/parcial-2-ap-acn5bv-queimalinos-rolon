package com.fittrainer.ui.account.edit

import com.fittrainer.data.account.AVATAR_TOO_LARGE
import com.fittrainer.data.account.AvatarReader
import com.fittrainer.data.account.PHONE_ERROR
import com.fittrainer.data.account.ProfileField
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.notifications.FakeFcmTokenSource
import com.fittrainer.testing.fakes.account.FakeMyProfileDao
import com.fittrainer.testing.fakes.account.FakeProfileApi
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.ui.account.NEEDS_CONNECTION
import com.fittrainer.ui.account.PHOTO_UNREADABLE
import com.fittrainer.ui.account.PROFILE_LOAD_FAILED
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class EditProfileViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeProfileApi()
    private val dao = FakeMyProfileDao()
    private val net = FakeConnectivityObserver()
    private val repo = ProfileRepository(api, dao, FakeTokenStore(authState()), FakeFcmTokenSource(), Clock.systemUTC())
    private var photo: ByteArray? = byteArrayOf(1, 2)

    private suspend fun TestScope.started(session: SessionRepository = FakeStudentSession(), role: Role = Role.STUDENT): EditProfileViewModel {
        repo.refresh(if (role == Role.STUDENT) "u1" else "t1", role)
        val vm = EditProfileViewModel(repo, AvatarReader { photo }, session, net)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        return vm
    }

    @Test fun arrancaConLoDeRoomYSinCambiosNoSePuedeGuardar() = runTest {
        val s = started().uiState.value
        assertTrue(s.loaded)
        assertEquals("11 5555 5555", s.form.phone)
        assertFalse(s.canSave)
    }

    @Test fun guardaSoloElTelefonoYVuelve() = runTest {
        val vm = started()
        vm.onPhone("11 4444 4444")
        assertTrue(vm.uiState.value.canSave)
        vm.onSave()
        advanceUntilIdle()
        assertEquals(mapOf("phone" to JsonPrimitive("11 4444 4444")), api.patches.single())
        assertTrue(vm.uiState.value.saved)
    }

    @Test fun telefonoInvalidoSeAvisaSinMandar() = runTest {
        val vm = started()
        vm.onPhone("12")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(PHONE_ERROR, vm.uiState.value.fieldErrors[ProfileField.PHONE])
        assertTrue(api.patches.isEmpty())
    }

    @Test fun elErrorDelBackendVaAlCampo() = runTest {
        val vm = started()
        api.error = httpError(400, """{"error":{"message":"x","details":[{"field":"name","message":"name debe tener entre 2 y 100 caracteres"}]}}""")
        vm.onName("Ana María")
        vm.onSave()
        advanceUntilIdle()
        assertEquals("name debe tener entre 2 y 100 caracteres", vm.uiState.value.fieldErrors[ProfileField.NAME])
        assertFalse(vm.uiState.value.saved)
    }

    @Test fun sinRedNoSePuedeGuardarNiSubirFoto() = runTest {
        val vm = started()
        net.state.value = false
        vm.onPhone("11 4444 4444")
        advanceUntilIdle()
        assertFalse(vm.uiState.value.canSave)
        vm.onSave()
        vm.onPhotoPicked("content://foto")
        advanceUntilIdle()
        assertTrue(api.patches.isEmpty())
        assertEquals(0, api.uploads)
    }

    @Test fun fotoQueNoSeLeeOQueEsGrandeTieneSuAviso() = runTest {
        val vm = started()
        photo = null
        vm.onPhotoPicked("content://foto")
        advanceUntilIdle()
        assertEquals(PHOTO_UNREADABLE, vm.uiState.value.photoError)
        photo = byteArrayOf(1)
        api.error = httpError(413)
        vm.onPhotoPicked("content://foto")
        advanceUntilIdle()
        assertEquals(AVATAR_TOO_LARGE, vm.uiState.value.photoError)
    }

    @Test fun fotoNuevaSeVeEnseguida() = runTest {
        val vm = started()
        vm.onPhotoPicked("content://foto")
        advanceUntilIdle()
        assertEquals("https://x/nueva.jpg?sig=2", vm.uiState.value.avatarUrl)
    }

    @Test fun elEntrenadorBorraElTitulo() = runTest {
        val vm = started(FakeTrainerSession(), Role.TRAINER)
        vm.onTitle("")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(mapOf("professional_title" to JsonNull), api.patches.single())
    }

    @Test fun sinPerfilEnRoomLoBajaAlEntrar() = runTest {
        val vm = EditProfileViewModel(repo, AvatarReader { photo }, FakeStudentSession(), net)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertTrue(vm.uiState.value.loaded)
        assertEquals("Ana", vm.uiState.value.form.name)
    }

    @Test fun sinPerfilYConFallaAlBajarloSeAvisa() = runTest {
        api.error = httpError(500)
        val vm = EditProfileViewModel(repo, AvatarReader { photo }, FakeStudentSession(), net)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        advanceUntilIdle()
        assertFalse(vm.uiState.value.loaded)
        assertEquals(PROFILE_LOAD_FAILED, vm.uiState.value.error)
    }

    @Test fun sinRedAlGuardarSeAvisaQueHaceFaltaConexion() = runTest {
        val vm = started()
        api.error = IOException("sin red")
        vm.onPhone("11 4444 4444")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(NEEDS_CONNECTION, vm.uiState.value.error)
        assertFalse(vm.uiState.value.saved)
    }

    @Test fun conLaFotoSubiendoNoSeGuardaYGuardandoNoSeSubeFoto() = runTest {
        val vm = started()
        vm.onName("Ana B.")
        val upload = CompletableDeferred<Unit>().also { api.avatarGate = it }
        vm.onPhotoPicked("content://foto")
        advanceUntilIdle()
        assertTrue(vm.uiState.value.photoBusy)
        assertFalse(vm.uiState.value.canSave)
        vm.onSave()
        advanceUntilIdle()
        assertTrue(api.patches.isEmpty())
        upload.complete(Unit)
        advanceUntilIdle()
        assertTrue(vm.uiState.value.canSave)

        val patch = CompletableDeferred<Unit>().also { api.patchGate = it }
        vm.onSave()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.saving)
        vm.onPhotoPicked("content://otra")
        vm.onRemovePhoto()
        advanceUntilIdle()
        assertEquals(1, api.uploads)
        assertEquals(0, api.removes)
        patch.complete(Unit)
        advanceUntilIdle()
        assertTrue(vm.uiState.value.saved)
    }
}
