package com.fittrainer.data.gamification

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** El día que vale para la racha lo define Buenos Aires, igual que el backend (ADR 0005), no la zona del teléfono. */
val BUSINESS_ZONE: ZoneId = ZoneId.of("America/Argentina/Buenos_Aires")

fun businessDate(millis: Long): LocalDate = Instant.ofEpochMilli(millis).atZone(BUSINESS_ZONE).toLocalDate()

data class LocalStreak(val current: Int, val longest: Int)

/**
 * Racha con las sesiones que la foto no conoce (spec §3.3). Parte de la foto y recorre en orden los días
 * entrenados posteriores a su último día: suma 1, o vuelve a 1 si en el medio quedó un día asignado sin entrenar.
 * Al final, si entre el último día entrenado y hoy hay uno asignado sin entrenar, la racha actual es 0.
 * [assignedDays] vacío = sin rutina: todos los días son asignados.
 */
fun localStreak(snapshot: Snapshot, trainedDays: Collection<LocalDate>, assignedDays: Set<DayOfWeek>, today: LocalDate): LocalStreak {
    val assigned = assignedDays.ifEmpty { DayOfWeek.entries.toSet() }
    var current = snapshot.currentStreak
    var longest = snapshot.longestStreak
    var last = snapshot.lastSessionDate
    for (day in trainedDays.filter { it <= today }.toSortedSet()) {
        if (last != null && day <= last) continue
        current = if (last == null || assignedBetween(last, day, assigned)) 1 else current + 1
        longest = maxOf(longest, current)
        last = day
    }
    if (last != null && assignedBetween(last, today, assigned)) current = 0
    return LocalStreak(current, longest)
}

/** ¿Hay un día asignado estrictamente entre [from] y [to]? Los entrenados ya se recorrieron, así que quedó sin entrenar. */
private fun assignedBetween(from: LocalDate, to: LocalDate, assigned: Set<DayOfWeek>): Boolean {
    var day = from.plusDays(1)
    var checked = 0
    // Una semana alcanza: con algún día asignado, siete días seguidos siempre lo incluyen.
    while (day < to && checked < 7) {
        if (day.dayOfWeek in assigned) return true
        day = day.plusDays(1)
        checked++
    }
    return false
}
