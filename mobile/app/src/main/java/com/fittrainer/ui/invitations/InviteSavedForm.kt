package com.fittrainer.ui.invitations

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.invitation.invite.InviteForm

private const val K_NAME = "invite.name"
private const val K_EMAIL = "invite.email"
private const val K_GOAL = "invite.goal"
private const val K_LEVEL = "invite.level"
private const val K_PHONE = "invite.phone"
private const val K_EQUIPMENT = "invite.equipment"
private const val K_INJURIES = "invite.injuries"
private const val K_TEMPLATE = "invite.template"
private const val K_DAYS = "invite.days"

/** El formulario en el SavedStateHandle: sobrevive a que el sistema mate la app al ir a WhatsApp. */
internal fun SavedStateHandle.saveInviteForm(form: InviteForm) {
    this[K_NAME] = form.name
    this[K_EMAIL] = form.email
    this[K_GOAL] = form.goal
    this[K_LEVEL] = form.level
    this[K_PHONE] = form.phone
    this[K_EQUIPMENT] = ArrayList(form.equipment)
    this[K_INJURIES] = form.injuries
    this[K_TEMPLATE] = form.templateId
    this[K_DAYS] = ArrayList(form.routineDays)
}

internal fun SavedStateHandle.readInviteForm() = InviteForm(
    name = this[K_NAME] ?: "",
    email = this[K_EMAIL] ?: "",
    goal = this[K_GOAL],
    level = this[K_LEVEL],
    phone = this[K_PHONE] ?: "",
    equipment = get<ArrayList<String>>(K_EQUIPMENT) ?: emptyList(),
    injuries = this[K_INJURIES] ?: "",
    templateId = get<String>(K_TEMPLATE)?.takeIf { it.isNotEmpty() },
    routineDays = get<ArrayList<String>>(K_DAYS)?.toSet() ?: emptySet(),
)
