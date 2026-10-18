package com.fittrainer.ui.workout.service

import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.delay

/**
 * Solo suena si el service esperó el fin del descanso. Si al verlo por primera vez ya estaba vencido
 * (proceso muerto, app reabierta tarde), se pasa a la serie siguiente sin aviso (spec §5).
 */
fun alarmAfterWait(leftMs: Long): Boolean = leftMs > 0

/**
 * Espera [leftMs] y avisa el fin del descanso. La carga de "Próxima" ([prepare], que lee el historial) se
 * calcula ANTES de esperar: entre el fin del delay, [notify] y [ended] no queda ningún punto de suspensión,
 * así que una emisión nueva (la pantalla cerrando el descanso) no puede cancelar el bloque a mitad y perder
 * el aviso. Si lo cancelan durante la espera no se llama a ninguno de los dos: el fin sigue pendiente y la
 * emisión siguiente lo avisa por `restJustEnded`. Un solo aviso gane quien gane.
 */
suspend fun <T : Any> awaitRestEnd(leftMs: Long, prepare: suspend () -> T, notify: (T) -> Unit, ended: () -> Unit) {
    val next = if (alarmAfterWait(leftMs)) prepare() else null
    delay(leftMs)
    next?.let(notify)
    ended()
}

/**
 * Lee el historial para la precarga; si Room falla devuelve null (se precarga con el plan) así el service
 * sigue mirando el descanso y avisa igual. La cancelación no se traga.
 */
suspend fun <T> historyOrNull(read: suspend () -> T?): T? = try {
    read()
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    null
}
