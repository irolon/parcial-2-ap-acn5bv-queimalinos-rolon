package com.fittrainer.data.db.routine

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * Caché de rutinas. Se reemplaza entero en cada sync: así una rutina que el entrenador
 * desactivó o borró desaparece del teléfono.
 */
@Dao
abstract class RoutineDao {

    @Transaction
    @Query("SELECT * FROM routines")
    abstract fun observeRoutines(): Flow<List<RoutineWithExercises>>

    @Query("SELECT * FROM routine_sync WHERE id = 0")
    abstract fun observeSync(): Flow<RoutineSyncEntity?>

    @Transaction
    @Query("SELECT * FROM routines")
    abstract suspend fun getRoutines(): List<RoutineWithExercises>

    @Query("SELECT * FROM routine_sync WHERE id = 0")
    abstract suspend fun getSync(): RoutineSyncEntity?

    @Insert
    abstract suspend fun insertRoutines(routines: List<RoutineEntity>)

    @Insert
    abstract suspend fun insertExercises(exercises: List<RoutineExerciseEntity>)

    @Upsert
    abstract suspend fun upsertSync(sync: RoutineSyncEntity)

    @Query("DELETE FROM routine_exercises")
    abstract suspend fun deleteExercises()

    @Query("DELETE FROM routines")
    abstract suspend fun deleteRoutines()

    @Query("DELETE FROM routine_sync")
    abstract suspend fun deleteSync()

    /** Todo o nada: si algo falla a mitad de camino, queda el caché anterior. */
    @Transaction
    open suspend fun replaceAll(
        sync: RoutineSyncEntity,
        routines: List<RoutineEntity>,
        exercises: List<RoutineExerciseEntity>,
    ) {
        deleteExercises()
        deleteRoutines()
        insertRoutines(routines)
        insertExercises(exercises)
        upsertSync(sync)
    }

    @Transaction
    open suspend fun clear() {
        deleteExercises()
        deleteRoutines()
        deleteSync()
    }

    /**
     * Dueño y rutinas leídos juntos, en una sola transacción. null si el caché no es de [ownerId].
     * Observar rutinas y dueño en dos flujos no alcanza: Room re-consulta cada uno por separado y
     * una emisión podía juntar el dueño nuevo con las rutinas del anterior.
     */
    @Transaction
    open suspend fun snapshot(ownerId: String): RoutineSnapshot? {
        val sync = getSync()?.takeIf { it.ownerId == ownerId } ?: return null
        return RoutineSnapshot(sync, getRoutines())
    }

    /** Borra el caché solo si sigue siendo de [ownerId]: un logout que termina tarde no toca el del siguiente. */
    @Transaction
    open suspend fun clearIfOwner(ownerId: String) {
        if (getSync()?.ownerId == ownerId) clear()
    }
}
