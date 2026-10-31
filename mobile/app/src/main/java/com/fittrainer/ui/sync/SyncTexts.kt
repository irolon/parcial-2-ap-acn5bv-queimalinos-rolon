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

/**
 * Qué muestra el aviso de Hoy: el texto, si va "Subir ahora" (solo con pendientes) y si se puede descartar
 * (solo con rechazos). null: no se muestra.
 */
data class UploadsNoticeUi(val text: String, val canUpload: Boolean, val uploading: Boolean, val canDismiss: Boolean = false)

fun uploadsNoticeUi(counts: UploadCounts, manual: ManualUpload): UploadsNoticeUi? {
    val base = pendingUploadsText(counts)
    val text = when {
        manual == ManualUpload.FAILED && counts.pending > 0 ->
            listOfNotNull(base, "No se pudo subir, se reintenta solo cuando haya conexión").joinToString(" · ")
        manual == ManualUpload.IN_BACKGROUND && counts.pending > 0 ->
            listOfNotNull(base, "Sigue subiendo en segundo plano").joinToString(" · ")
        manual == ManualUpload.DONE && counts.pending == 0 -> listOfNotNull("Subido ✓", base).joinToString(" · ")
        else -> base
    } ?: return null
    return UploadsNoticeUi(
        text,
        canUpload = counts.pending > 0,
        uploading = manual == ManualUpload.UPLOADING,
        canDismiss = counts.failed > 0 || counts.failedSets > 0,
    )
}

const val SIGN_OUT_REJECTED_TEXT =
    "Algunos entrenamientos o series no se pudieron subir y no se van a reintentar. Quedan guardados en el " +
        "celular y los ves en Hoy. ¿Cerrar sesión igual?"

/** Título del aviso del logout: no dice "Entrenamientos" si lo único que queda son comentarios post-entreno. */
fun signOutPendingTitle(pending: Int, feedback: Int): String = when {
    feedback == 0 -> "Entrenamientos sin subir"
    pending == 0 -> "Comentarios sin subir"
    else -> "Datos sin subir"
}

/** Lo que se pierde al salir: entrenamientos sin subir y/o comentarios post-entreno (RPE y nota) sin mandar. */
fun signOutPendingText(pending: Int, feedback: Int = 0): String {
    val workouts = if (pending == 1) "1 entrenamiento" else "$pending entrenamientos"
    val comments = if (feedback == 1) "1 comentario post-entreno" else "$feedback comentarios post-entreno"
    val (what, one) = when {
        feedback == 0 -> workouts to (pending == 1)
        pending == 0 -> comments to (feedback == 1)
        else -> "$workouts y $comments" to false
    }
    return "Tenés $what sin subir. ${if (one) "Se va" else "Se van"} a subir cuando vuelvas a entrar."
}

/** Aviso del logout cuando no subió todo; si además hubo un rechazo, lo dice antes (PR #40: ninguno tapa al otro). */
fun signOutFailedText(pending: Int, feedback: Int, rejected: Boolean): String =
    (if (rejected) "El servidor rechazó parte de lo subido; lo ves en Hoy. " else "") +
        "¿Cerrar sesión igual? ${signOutPendingText(pending, feedback)}"
