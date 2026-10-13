package com.fittrainer.ui.health

import com.fittrainer.data.repository.HealthSnapshot

/** snapshot = lo que hay en Room (puede ser viejo); error = último refresh fallido. */
data class HealthUiState(
    val snapshot: HealthSnapshot? = null,
    val isRefreshing: Boolean = false,
    val error: String? = null,
)
