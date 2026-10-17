package com.fittrainer.data.db.library

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Un ejercicio de la biblioteca. position = orden en que lo mandó el backend (por nombre). */
@Entity(tableName = "library_exercises")
data class LibraryExerciseEntity(
    @PrimaryKey val id: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val description: String?,
    val videoUrl: String?,
    val position: Int,
)

/** Última sincronización buena. Una sola fila (id = 0). ownerId = alumno dueño del caché. */
@Entity(tableName = "library_sync")
data class LibrarySyncEntity(
    @PrimaryKey val id: Int = 0,
    val ownerId: String,
    val lastSyncedAt: Long,
)

/** Lo que hay en el caché para su dueño, leído en una sola transacción. */
data class LibrarySnapshot(
    val sync: LibrarySyncEntity,
    val exercises: List<LibraryExerciseEntity>,
)
