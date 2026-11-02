package com.fittrainer.ui.invitations

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.invitation.invite.InviteField
import com.fittrainer.data.invitation.invite.InviteForm
import com.fittrainer.data.invitation.invite.InviteRepository
import com.fittrainer.data.invitation.invite.InviteResult
import com.fittrainer.data.invitation.invite.errors
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Formulario → envío → resultado. Invitar necesita red: sin conexión no se envía. El formulario se
 * guarda en el SavedStateHandle (sobrevive a que el sistema mate la app al ir a WhatsApp); el
 * resultado vive en el ViewModel (sobrevive a rotar).
 */
@HiltViewModel
class InviteViewModel @Inject constructor(
    private val repository: InviteRepository,
    connectivity: ConnectivityObserver,
    private val saved: SavedStateHandle,
) : ViewModel() {

    private val _state = MutableStateFlow<InviteUiState>(InviteUiState.Editing(form = savedForm()))
    val state: StateFlow<InviteUiState> = _state.asStateFlow()
    private var submitted = false
    private var serverErrors: Map<InviteField, String> = emptyMap()

    // La conectividad se guarda aparte del estado: mientras se muestra el resultado no hay Editing donde anotarla.
    private var offline = false

    init {
        viewModelScope.launch {
            connectivity.isOnline.collect { online ->
                offline = !online
                editing { it.copy(offline = offline) }
            }
        }
    }

    fun onChange(field: InviteField, value: String?) = updateForm(field) {
        when (field) {
            InviteField.NAME -> it.copy(name = value.orEmpty())
            InviteField.EMAIL -> it.copy(email = value.orEmpty())
            InviteField.GOAL -> it.copy(goal = value)
            InviteField.LEVEL -> it.copy(level = value)
            InviteField.PHONE -> it.copy(phone = value.orEmpty())
            InviteField.INJURIES -> it.copy(injuries = value.orEmpty())
            InviteField.EQUIPMENT -> it
        }
    }

    fun onAddEquipment(text: String) {
        val item = text.trim()
        if (item.isEmpty()) return
        updateForm(InviteField.EQUIPMENT) { if (item in it.equipment) it else it.copy(equipment = it.equipment + item) }
    }

    fun onRemoveEquipment(index: Int) =
        updateForm(InviteField.EQUIPMENT) { it.copy(equipment = it.equipment.filterIndexed { i, _ -> i != index }) }

    fun onToggleMore() = editing { it.copy(showMore = !it.showMore) }

    fun dismissNotice() = editing { it.copy(notice = null) }

    fun onSubmit() {
        val current = _state.value as? InviteUiState.Editing ?: return
        if (!current.canSubmit) return
        submitted = true
        serverErrors = emptyMap()
        val errors = current.form.errors()
        if (errors.isNotEmpty()) {
            _state.value = current.copy(errors = errors, notice = null, showMore = current.showMore || errors.hidesInMore())
            return
        }
        _state.value = current.copy(errors = emptyMap(), sending = true, notice = null)
        viewModelScope.launch {
            when (val result = repository.create(current.form)) {
                is InviteResult.Created -> _state.value = InviteUiState.Done(result.invitation, current.form.name.trim())
                is InviteResult.Rejected -> {
                    serverErrors = result.fields
                    editing {
                        it.copy(sending = false, errors = result.fields, notice = result.message, showMore = it.showMore || result.fields.hidesInMore())
                    }
                }
                is InviteResult.Failed -> editing {
                    it.copy(sending = false, notice = if (result.error == DataError.Offline) INVITE_NETWORK_FAILED else INVITE_SERVER_FAILED)
                }
            }
        }
    }

    /** Vuelve al formulario vacío. */
    fun onInviteAnother() {
        submitted = false
        serverErrors = emptyMap()
        saveForm(InviteForm())
        _state.value = InviteUiState.Editing(offline = offline)
    }

    private fun updateForm(field: InviteField, change: (InviteForm) -> InviteForm) = editing { s ->
        val form = change(s.form)
        saveForm(form)
        serverErrors = serverErrors - field
        val local = if (submitted) form.errors() else emptyMap()
        s.copy(form = form, errors = serverErrors + local)
    }

    private fun editing(change: (InviteUiState.Editing) -> InviteUiState.Editing) =
        _state.update { if (it is InviteUiState.Editing) change(it) else it }

    private fun saveForm(form: InviteForm) {
        saved[K_NAME] = form.name
        saved[K_EMAIL] = form.email
        saved[K_GOAL] = form.goal
        saved[K_LEVEL] = form.level
        saved[K_PHONE] = form.phone
        saved[K_EQUIPMENT] = ArrayList(form.equipment)
        saved[K_INJURIES] = form.injuries
    }

    private fun savedForm() = InviteForm(
        name = saved[K_NAME] ?: "",
        email = saved[K_EMAIL] ?: "",
        goal = saved[K_GOAL],
        level = saved[K_LEVEL],
        phone = saved[K_PHONE] ?: "",
        equipment = saved.get<ArrayList<String>>(K_EQUIPMENT) ?: emptyList(),
        injuries = saved[K_INJURIES] ?: "",
    )

    /** Hay un error en un campo de "Más datos": la sección se despliega para que se vea. */
    private fun Map<InviteField, String>.hidesInMore() = keys.any { it in MORE_FIELDS }

    private companion object {
        val MORE_FIELDS = setOf(InviteField.PHONE, InviteField.EQUIPMENT, InviteField.INJURIES)

        const val K_NAME = "invite.name"
        const val K_EMAIL = "invite.email"
        const val K_GOAL = "invite.goal"
        const val K_LEVEL = "invite.level"
        const val K_PHONE = "invite.phone"
        const val K_EQUIPMENT = "invite.equipment"
        const val K_INJURIES = "invite.injuries"
    }
}
