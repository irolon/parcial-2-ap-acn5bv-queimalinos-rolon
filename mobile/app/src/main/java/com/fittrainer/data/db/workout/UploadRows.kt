package com.fittrainer.data.db.workout

/**
 * Lo que el alumno tiene sin resolver: sesiones terminadas sin subir (pending), sesiones que el
 * servidor rechazó enteras (failed) y series rechazadas de sesiones que sí se subieron (failedSets).
 */
data class UploadCounts(val pending: Int = 0, val failed: Int = 0, val failedSets: Int = 0) {
    /** Sesiones y series que el servidor rechazó (y el alumno todavía no descartó). */
    val rejections: Int get() = failed + failedSets
}

/** Estado de subida de una sesión y cuántas de sus series rechazó el servidor. */
data class SessionUploadRow(val syncState: String, val failedSets: Int)
