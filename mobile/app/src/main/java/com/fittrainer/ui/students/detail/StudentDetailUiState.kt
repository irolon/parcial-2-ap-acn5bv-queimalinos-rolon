package com.fittrainer.ui.students.detail

import com.fittrainer.data.students.StudentStatus
import com.fittrainer.data.students.detail.StudentDetail

/**
 * loaded == false: todavía no se leyó Room. detail == null con loaded: nunca se bajó esta ficha.
 * gone: el backend dijo que el alumno ya no es del entrenador; la pantalla avisa y vuelve atrás.
 */
data class StudentDetailUiState(
    val loaded: Boolean = false,
    val detail: StudentDetail? = null,
    val header: String = "",
    val status: StudentStatus? = null,
    val syncedLabel: String? = null,
    val offline: Boolean = false,
    val refreshing: Boolean = false,
    val saving: Boolean = false,
    val confirmDisable: Boolean = false,
    val notice: String? = null,
    val gone: Boolean = false,
) {
    /** Editar, dar de baja y reactivar piden red y una ficha cargada. */
    val canAct: Boolean get() = detail != null && !offline && !saving
}
