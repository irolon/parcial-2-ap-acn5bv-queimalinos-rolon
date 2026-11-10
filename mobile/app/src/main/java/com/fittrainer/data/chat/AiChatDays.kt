package com.fittrainer.data.chat

import com.fittrainer.data.agenda.localDay
import com.fittrainer.data.agenda.student.dayStartMillis
import java.time.Clock
import java.time.LocalDate
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flow

/** Mínimo entre dos lecturas del reloj, por si el reloj del celular se atrasa justo en la medianoche. */
private const val MIN_TICK_MS = 1_000L

/** El día de Argentina de [clock]: emite ahora y de nuevo en cada medianoche, mientras haya alguien escuchando. */
internal fun argentinaDays(clock: Clock): Flow<LocalDate> = flow {
    while (true) {
        val now = clock.millis()
        val day = localDay(clock.instant())
        emit(day)
        delay(maxOf(MIN_TICK_MS, dayStartMillis(day.plusDays(1)) - now))
    }
}.distinctUntilChanged()

/** [from, to) en epoch millis del día de Argentina [day]. */
internal fun dayBounds(day: LocalDate): Pair<Long, Long> = dayStartMillis(day) to dayStartMillis(day.plusDays(1))
