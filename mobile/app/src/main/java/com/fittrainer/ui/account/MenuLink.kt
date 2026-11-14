package com.fittrainer.ui.account

/** Un acceso del menú de Perfil / Más (Plantillas, Mis turnos, …). */
data class MenuLink(val label: String, val onClick: () -> Unit)
