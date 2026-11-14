package com.fittrainer.ui.account.edit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.account.AvatarReader
import com.fittrainer.data.account.AvatarRejectedException
import com.fittrainer.data.account.FieldErrorsException
import com.fittrainer.data.account.ProfileField
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.role
import com.fittrainer.data.session.userId
import com.fittrainer.ui.account.PHOTO_FAILED
import com.fittrainer.ui.account.PROFILE_LOAD_FAILED
import com.fittrainer.ui.account.PHOTO_UNREADABLE
import com.fittrainer.ui.account.SAVE_FAILED
import com.fittrainer.ui.account.saveFailure
import com.fittrainer.ui.account.unshownMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private data class Local(
    val form: EditProfileForm? = null,
    val fieldErrors: Map<ProfileField, String> = emptyMap(),
    val error: String? = null,
    val saving: Boolean = false,
    val photoBusy: Boolean = false,
    val photoError: String? = null,
    val saved: Boolean = false,
)

/**
 * Editar perfil: el formulario arranca con lo de Room y manda solo lo que cambió. La foto (solo el alumno) se sube
 * o se quita al momento, sin esperar a Guardar. Todo es solo con red: sin conexión se ve el aviso y no se manda.
 */
@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val repository: ProfileRepository,
    private val avatars: AvatarReader,
    private val sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val session = sessionRepository.session.stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val local = MutableStateFlow(Local())

    @OptIn(ExperimentalCoroutinesApi::class)
    private val profile = session.flatMapLatest { s -> s.userId?.let { repository.observe(it) } ?: flowOf(null) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val uiState: StateFlow<EditProfileUiState> = combine(profile, online, local) { p, on, l ->
        val role = session.value.role
        if (p == null || role == null) return@combine EditProfileUiState(offline = !on, error = l.error)
        val form = l.form ?: p.toForm()
        EditProfileUiState(
            loaded = true,
            role = role,
            form = form,
            email = p.email,
            avatarUrl = p.avatarUrl,
            fieldErrors = l.fieldErrors,
            error = l.error,
            saving = l.saving,
            canSave = on && !l.saving && !l.photoBusy && form.changesFrom(p, role).isNotEmpty(),
            photoBusy = l.photoBusy,
            photoError = l.photoError,
            offline = !on,
            saved = l.saved,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), EditProfileUiState())

    init {
        // Si se entra sin perfil en Room (Perfil / Más no pudo bajarlo), se intenta acá; sin red queda el aviso.
        viewModelScope.launch {
            val s = sessionRepository.session.filterNotNull().first()
            val owner = s.userId ?: return@launch
            val role = s.role ?: return@launch
            if (repository.observe(owner).first() != null) return@launch
            repository.refresh(owner, role).onFailure {
                if (online.value) local.update { it.copy(error = PROFILE_LOAD_FAILED) }
            }
        }
    }

    fun onName(value: String) = edit { it.copy(name = value) }
    fun onPhone(value: String) = edit { it.copy(phone = value) }
    fun onTitle(value: String) = edit { it.copy(title = value) }

    private fun edit(change: (EditProfileForm) -> EditProfileForm) {
        val start = profile.value?.toForm() ?: return
        // Escribir saca el error del guardado anterior; los de campo se vuelven a mirar al guardar.
        local.update { it.copy(form = change(it.form ?: start), fieldErrors = emptyMap(), error = null) }
    }

    fun onSave() {
        val p = profile.value ?: return
        val role = session.value.role ?: return
        val form = local.value.form ?: return
        val errors = form.errors(role)
        if (errors.isNotEmpty()) return local.update { it.copy(fieldErrors = errors) }
        val changes = form.changesFrom(p, role)
        // Con la foto en curso no se guarda: al guardar se vuelve atrás y eso cancelaría la subida.
        if (changes.isEmpty() || local.value.saving || local.value.photoBusy || !online.value) return
        local.update { it.copy(saving = true, error = null) }
        viewModelScope.launch {
            val result = repository.update(session.value.userId ?: return@launch, role, changes)
            local.update { l ->
                result.fold(
                    onSuccess = { l.copy(saving = false, saved = true) },
                    onFailure = { e -> failed(l.copy(saving = false), e) },
                )
            }
        }
    }

    private fun failed(l: Local, e: Throwable): Local = when (e) {
        is FieldErrorsException -> {
            val fields = e.fields.mapNotNull { (wire, msg) -> fieldOf(wire)?.let { it to msg } }.toMap()
            val general = e.unshownMessage(fields.keys.map { it.wire }.toSet())
            l.copy(fieldErrors = fields, error = general ?: if (fields.isEmpty()) SAVE_FAILED else null)
        }
        else -> l.copy(error = saveFailure(e))
    }

    /** La foto elegida: se achica y se sube enseguida. */
    fun onPhotoPicked(uri: String) = photo { owner ->
        val jpeg = avatars.jpeg(uri) ?: return@photo Result.failure(IllegalArgumentException(PHOTO_UNREADABLE))
        repository.setAvatar(owner, jpeg)
    }

    fun onRemovePhoto() = photo { owner -> repository.removeAvatar(owner) }

    private fun photo(block: suspend (owner: String) -> Result<Unit>) {
        val owner = session.value.userId ?: return
        if (session.value.role != Role.STUDENT || local.value.photoBusy || local.value.saving || !online.value) return
        local.update { it.copy(photoBusy = true, photoError = null) }
        viewModelScope.launch {
            val error = block(owner).exceptionOrNull()?.let(::photoMessage)
            local.update { it.copy(photoBusy = false, photoError = error) }
        }
    }

    private fun photoMessage(e: Throwable): String = when (e) {
        is AvatarRejectedException -> e.message ?: PHOTO_FAILED
        is IllegalArgumentException -> PHOTO_UNREADABLE
        else -> PHOTO_FAILED
    }
}
