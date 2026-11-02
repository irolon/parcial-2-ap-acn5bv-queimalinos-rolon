package com.fittrainer.data.routines.trainer

/**
 * Por rutina: el último reorder pedido (ticket), cuántos hay en vuelo y el último orden que confirmó el
 * servidor. Con eso, un ↑↑↑ rápido solo guarda la respuesta del último y, si el último falla, vuelve al
 * orden confirmado (no al orden local de un reorder anterior que todavía no se confirmó).
 */
internal class ReorderTracker {

    private class State(var latest: Int = 0, var pending: Int = 0, var confirmed: List<String>? = null)

    private val states = HashMap<String, State>()

    /** [current]: el orden en Room antes de aplicar este reorder. Si no hay otro en vuelo, es el confirmado. */
    @Synchronized
    fun start(routineId: String, current: List<String>): Int {
        val state = states.getOrPut(routineId) { State() }
        if (state.pending == 0) state.confirmed = current
        state.pending++
        state.latest++
        return state.latest
    }

    @Synchronized
    fun confirm(routineId: String, order: List<String>) {
        states[routineId]?.confirmed = order
    }

    @Synchronized
    fun isLatest(routineId: String, ticket: Int): Boolean = states[routineId]?.latest == ticket

    @Synchronized
    fun confirmed(routineId: String): List<String>? = states[routineId]?.confirmed

    @Synchronized
    fun finish(routineId: String) {
        val state = states[routineId] ?: return
        state.pending--
        if (state.pending <= 0) states.remove(routineId)
    }
}
