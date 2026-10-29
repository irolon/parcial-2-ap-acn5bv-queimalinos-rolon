package com.fittrainer.ui.sync

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts

/** Línea del resumen al terminar (spec §6). null: todavía no se leyó Room. */
fun sessionUploadText(row: SessionUploadRow?): String? = when {
    row == null -> null
    row.syncState == SYNC_FAILED -> "No se pudo subir este entrenamiento"
    row.syncState == SYNC_SYNCED && row.failedSets == 1 -> "Subido · 1 serie no se pudo subir"
    row.syncState == SYNC_SYNCED && row.failedSets > 1 -> "Subido · ${row.failedSets} series no se pudieron subir"
    row.syncState == SYNC_SYNCED -> "Subido ✓"
    else -> "Guardado en el celular · se sube cuando haya conexión"
}

/** Aviso de Hoy (spec §6): null si no hay nada pendiente ni fallido. */
fun pendingUploadsText(counts: UploadCounts): String? = listOfNotNull(
    counts.pending.takeIf { it > 0 }?.let { if (it == 1) "1 entrenamiento sin subir" else "$it entrenamientos sin subir" },
    counts.failed.takeIf { it > 0 }?.let {
        if (it == 1) "1 entrenamiento no se pudo subir" else "$it entrenamientos no se pudieron subir"
    },
    counts.failedSets.takeIf { it > 0 }?.let {
        if (it == 1) "1 serie no se pudo subir" else "$it series no se pudieron subir"
    },
).joinToString(" · ").ifEmpty { null }

fun signOutPendingText(pending: Int): String =
    if (pending == 1) "Tenés 1 entrenamiento sin subir. Se va a subir cuando vuelvas a entrar."
    else "Tenés $pending entrenamientos sin subir. Se van a subir cuando vuelvas a entrar."
