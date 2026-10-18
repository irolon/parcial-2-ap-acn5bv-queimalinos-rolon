package com.fittrainer.data.workout

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** La notificación de la sesión pidió abrirla: MainActivity lo anota y la navegación lo consume. */
@Singleton
class WorkoutLaunchRequests @Inject constructor() {
    private val _pending = MutableStateFlow(false)
    val pending: StateFlow<Boolean> = _pending.asStateFlow()

    fun request() {
        _pending.value = true
    }

    fun consume() {
        _pending.value = false
    }
}
