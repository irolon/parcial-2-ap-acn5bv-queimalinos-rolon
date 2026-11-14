package com.fittrainer.ui.account.edit

import com.fittrainer.data.account.MyProfile
import com.fittrainer.data.account.ProfileField
import com.fittrainer.data.account.blankToNull
import com.fittrainer.data.account.nameError
import com.fittrainer.data.account.phoneError
import com.fittrainer.data.account.titleError
import com.fittrainer.data.session.Role

/** Lo que está escrito en el formulario de Editar perfil. */
data class EditProfileForm(val name: String = "", val phone: String = "", val title: String = "")

fun MyProfile.toForm() = EditProfileForm(name, phone.orEmpty(), professionalTitle.orEmpty())

/** Los errores locales por campo; vacío = se puede mandar. Cada rol valida solo sus campos. */
fun EditProfileForm.errors(role: Role): Map<ProfileField, String> = buildMap {
    nameError(name)?.let { put(ProfileField.NAME, it) }
    if (role == Role.STUDENT) phoneError(phone)?.let { put(ProfileField.PHONE, it) }
    if (role == Role.TRAINER) titleError(title)?.let { put(ProfileField.TITLE, it) }
}

/**
 * Solo lo que cambió respecto de [original], recortado; vacío viaja como null (borra el dato). El nombre nunca
 * queda vacío: lo frena [errors] antes.
 */
fun EditProfileForm.changesFrom(original: MyProfile, role: Role): Map<ProfileField, String?> = buildMap {
    if (name.trim() != original.name) put(ProfileField.NAME, name.trim())
    if (role == Role.STUDENT && blankToNull(phone) != original.phone) put(ProfileField.PHONE, blankToNull(phone))
    if (role == Role.TRAINER && blankToNull(title) != original.professionalTitle) put(ProfileField.TITLE, blankToNull(title))
}

/** El 400 del backend trae el campo con su nombre de la API. */
fun fieldOf(wire: String): ProfileField? = ProfileField.entries.firstOrNull { it.wire == wire }
