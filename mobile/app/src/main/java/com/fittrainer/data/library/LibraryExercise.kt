package com.fittrainer.data.library

import java.time.Instant

/** Un ejercicio de la biblioteca, tal como lo ve la app (sin nada de Retrofit ni Room). */
data class LibraryExercise(
    val id: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val description: String?,
    val videoUrl: String?,
)

/** Caché de un alumno. lastSyncedAt == null: nunca sincronizó (o lo guardado es de otro usuario). */
data class LibraryCache(val exercises: List<LibraryExercise>, val lastSyncedAt: Instant?)
