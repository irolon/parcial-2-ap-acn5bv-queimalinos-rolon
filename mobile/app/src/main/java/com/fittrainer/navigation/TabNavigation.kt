package com.fittrainer.navigation

/**
 * Qué hace un toque en la barra de pestañas, decidido sobre las rutas del back stack (de abajo hacia arriba).
 * La pestaña marcada es la más alta que está en el back stack: así una ficha abierta desde Inicio deja
 * marcado Inicio, aunque su ruta cuelgue de trainer/students/.
 */
sealed interface TabAction {
    /** Ya está en la raíz de esa pestaña. */
    data object None : TabAction

    /** Vuelve a la raíz de la pestaña actual, cerrando lo que se abrió encima. */
    data class PopTo(val route: String) : TabAction

    /**
     * Cambia de pestaña guardando la actual. restoreState solo para las que no son la de inicio: la de
     * inicio queda abajo de todo, y restaurarla volvía a abrir la ficha que se había cerrado.
     */
    data class Navigate(val route: String, val restoreState: Boolean) : TabAction
}

/** La pestaña que queda marcada: la más alta del back stack o, si no hay ninguna, la madre de la ruta actual. */
fun selectedTab(tabRoutes: List<String>, backStack: List<String?>): String? =
    backStack.lastOrNull { it in tabRoutes }
        ?: backStack.lastOrNull()?.let { current -> tabRoutes.firstOrNull { isTabSelected(it, current) } }

fun tabAction(tab: String, tabRoutes: List<String>, backStack: List<String?>): TabAction {
    val current = backStack.lastOrNull()
    return when {
        tab == current -> TabAction.None
        tab == selectedTab(tabRoutes, backStack) && tab in backStack -> TabAction.PopTo(tab)
        else -> TabAction.Navigate(tab, restoreState = tab != tabRoutes.firstOrNull())
    }
}
