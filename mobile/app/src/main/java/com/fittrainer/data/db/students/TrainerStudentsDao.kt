package com.fittrainer.data.db.students

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Caché de la lista de alumnos. Mismo contrato que LibraryDao: se reemplaza entera y tiene dueño. */
@Dao
abstract class TrainerStudentsDao {

    @Query("SELECT * FROM trainer_students")
    abstract fun observeStudents(): Flow<List<TrainerStudentEntity>>

    @Query("SELECT * FROM trainer_students_sync WHERE id = 0")
    abstract fun observeSync(): Flow<TrainerStudentsSyncEntity?>

    @Query("SELECT * FROM trainer_students WHERE trainerId = :trainerId")
    abstract suspend fun getStudents(trainerId: String): List<TrainerStudentEntity>

    @Query("SELECT * FROM trainer_students_sync WHERE id = 0")
    abstract suspend fun getSync(): TrainerStudentsSyncEntity?

    @Insert
    abstract suspend fun insertStudents(students: List<TrainerStudentEntity>)

    @Upsert
    abstract suspend fun upsertSync(sync: TrainerStudentsSyncEntity)

    @Query("DELETE FROM trainer_students")
    abstract suspend fun deleteStudents()

    @Query("DELETE FROM trainer_students_sync")
    abstract suspend fun deleteSync()

    /** Todo o nada: si algo falla a mitad de camino, queda el caché anterior. */
    @Transaction
    open suspend fun replaceAll(sync: TrainerStudentsSyncEntity, students: List<TrainerStudentEntity>) {
        deleteStudents()
        insertStudents(students)
        upsertSync(sync)
    }

    @Transaction
    open suspend fun clear() {
        deleteStudents()
        deleteSync()
    }

    /** null si el caché no es de [trainerId]. */
    @Transaction
    open suspend fun snapshot(trainerId: String): TrainerStudentsSnapshot? {
        val sync = getSync()?.takeIf { it.trainerId == trainerId } ?: return null
        return TrainerStudentsSnapshot(sync, getStudents(trainerId))
    }

    /** Borra el caché solo si sigue siendo de [trainerId]: un logout que termina tarde no toca el del siguiente. */
    @Transaction
    open suspend fun clearIfOwner(trainerId: String) {
        if (getSync()?.trainerId == trainerId) clear()
    }
}
