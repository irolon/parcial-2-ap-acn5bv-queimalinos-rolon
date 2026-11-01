package com.fittrainer.data.db.students

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * Fichas cacheadas. También toca la fila de la lista (trainer_students) para que una edición o una
 * baja se vea en E1 sin esperar a un refresh, en la misma transacción.
 */
@Dao
abstract class TrainerStudentDetailDao {

    @Query("SELECT * FROM trainer_student_details WHERE trainerId = :trainerId AND id = :id")
    abstract fun observe(trainerId: String, id: String): Flow<TrainerStudentDetailEntity?>

    @Upsert
    abstract suspend fun upsert(detail: TrainerStudentDetailEntity)

    @Query("DELETE FROM trainer_student_details WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun delete(trainerId: String, id: String)

    @Query("UPDATE trainer_students SET name = :name, goal = :goal, active = :active WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun updateListRow(trainerId: String, id: String, name: String, goal: String?, active: Boolean)

    @Query("DELETE FROM trainer_students WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun deleteListRow(trainerId: String, id: String)

    @Query("DELETE FROM trainer_student_details WHERE trainerId = :trainerId")
    abstract suspend fun clearOwner(trainerId: String)

    @Query("DELETE FROM trainer_student_details")
    abstract suspend fun clear()

    /** La ficha nueva y la fila de la lista, juntas. */
    @Transaction
    open suspend fun saveAndSyncList(detail: TrainerStudentDetailEntity) {
        upsert(detail)
        updateListRow(detail.trainerId, detail.id, detail.name, detail.goal, detail.active)
    }

    /** El alumno ya no es del entrenador (o se borró): sale de la ficha y de la lista. */
    @Transaction
    open suspend fun forget(trainerId: String, id: String) {
        delete(trainerId, id)
        deleteListRow(trainerId, id)
    }
}
