package com.fittrainer.data.students

import java.time.Clock
import java.time.Duration
import java.time.Instant
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/** Una sesión abierta vence sola a las 4 h, como en la web (backend: OPEN_SESSION_MAX_HOURS). */
val OPEN_SESSION_WINDOW: Duration = Duration.ofHours(4)

/** Vigente mientras lleve menos de 4 h abierta. */
fun isOpenSessionLive(startedAt: Instant, now: Instant): Boolean = Duration.between(startedAt, now) < OPEN_SESSION_WINDOW

/**
 * Emite [value] y lo vuelve a emitir cada vez que vence una de las sesiones abiertas de [starts], para que la
 * pantalla la saque a las 4 h aunque Room no cambie ni haya red. Corre solo mientras alguien junta el flujo
 * (la pantalla visible); sin sesiones vigentes emite una vez y termina.
 */
fun <T> reemitAtOpenSessionExpiry(value: T, starts: List<Instant>, clock: Clock): Flow<T> = flow {
    while (true) {
        emit(value)
        val now = clock.instant()
        val next = starts.map { it + OPEN_SESSION_WINDOW }.filter { it > now }.minOrNull() ?: return@flow
        delay(Duration.between(now, next).toMillis() + 1)
    }
}
