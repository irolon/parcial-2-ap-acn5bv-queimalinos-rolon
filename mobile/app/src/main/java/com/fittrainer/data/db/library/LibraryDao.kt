package com.fittrainer.data.db.library

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Caché de la biblioteca. Mismo contrato que RoutineDao: se reemplaza entera y tiene dueño. */
@Dao
abstract class LibraryDao {

    @Query("SELECT * FROM library_exercises ORDER BY position")
    abstract fun observeExercises(): Flow<List<LibraryExerciseEntity>>

    @Query("SELECT * FROM library_sync WHERE id = 0")
    abstract fun observeSync(): Flow<LibrarySyncEntity?>

    @Query("SELECT * FROM library_exercises ORDER BY position")
    abstract suspend fun getExercises(): List<LibraryExerciseEntity>

    @Query("SELECT * FROM library_sync WHERE id = 0")
    abstract suspend fun getSync(): LibrarySyncEntity?

    @Insert
    abstract suspend fun insertExercises(exercises: List<LibraryExerciseEntity>)

    @Upsert
    abstract suspend fun upsertSync(sync: LibrarySyncEntity)

    @Query("DELETE FROM library_exercises")
    abstract suspend fun deleteExercises()

    @Query("DELETE FROM library_sync")
    abstract suspend fun deleteSync()

    /** Todo o nada: si algo falla a mitad de camino, queda el caché anterior. */
    @Transaction
    open suspend fun replaceAll(sync: LibrarySyncEntity, exercises: List<LibraryExerciseEntity>) {
        deleteExercises()
        insertExercises(exercises)
        upsertSync(sync)
    }

    @Transaction
    open suspend fun clear() {
        deleteExercises()
        deleteSync()
    }

    /** Dueño y ejercicios leídos juntos. null si el caché no es de [ownerId] (ver RoutineDao.snapshot). */
    @Transaction
    open suspend fun snapshot(ownerId: String): LibrarySnapshot? {
        val sync = getSync()?.takeIf { it.ownerId == ownerId } ?: return null
        return LibrarySnapshot(sync, getExercises())
    }

    /** Borra el caché solo si sigue siendo de [ownerId]: un logout que termina tarde no toca el del siguiente. */
    @Transaction
    open suspend fun clearIfOwner(ownerId: String) {
        if (getSync()?.ownerId == ownerId) clear()
    }
}
