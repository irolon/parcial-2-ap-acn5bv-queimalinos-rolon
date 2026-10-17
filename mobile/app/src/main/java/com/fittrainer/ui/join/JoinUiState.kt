package com.fittrainer.ui.join

data class JoinUiState(
    val link: String = "",
    val linkError: String? = null,
    /** Último QR leído que no era una invitación; el escáner sigue andando. */
    val scanError: String? = null,
    /** Token listo para ir a confirmar. La pantalla navega y llama a onNavigated(). */
    val token: String? = null,
)
