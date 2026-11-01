package com.fittrainer.data.db.students.sessions

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * Sesiones de los alumnos que vio el entrenador. Cada alumno se refresca sin tocar a los otros. La lista
 * (página 1 y las de "Ver más") sale de acá, ordenada por fecha: una sesión repetida entre páginas es
 * una sola fila (PK).
 */
@Dao
abstract class TrainerSessionsDao {

    @Query(
        "SELECT * FROM trainer_sessions WHERE trainerId = :trainerId AND studentId = :studentId AND listed = 1 " +
            "ORDER BY startedAt DESC, id DESC"
    )
    abstract fun observeListed(trainerId: String, studentId: String): Flow<List<TrainerSessionEntity>>

    @Query("SELECT * FROM trainer_sessions_sync WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract fun observeSync(trainerId: String, studentId: String): Flow<TrainerSessionsSyncEntity?>

    @Query("SELECT * FROM trainer_sessions_sync WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun getSync(trainerId: String, studentId: String): TrainerSessionsSyncEntity?

    @Query("SELECT * FROM trainer_sessions WHERE trainerId = :trainerId AND id = :id")
    abstract fun observeSession(trainerId: String, id: String): Flow<TrainerSessionEntity?>

    @Query("SELECT * FROM trainer_sessions WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun getSession(trainerId: String, id: String): TrainerSessionEntity?

    @Query("SELECT * FROM trainer_sessions WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun getStudentSessions(trainerId: String, studentId: String): List<TrainerSessionEntity>

    @Upsert
    abstract suspend fun upsertSessions(sessions: List<TrainerSessionEntity>)

    @Upsert
    abstract suspend fun upsertSync(sync: TrainerSessionsSyncEntity)

    /** Las que dejaron de estar en la lista y nunca se abrieron no sirven más. */
    @Query("DELETE FROM trainer_sessions WHERE trainerId = :trainerId AND studentId = :studentId AND listed = 0 AND exercisesJson IS NULL")
    abstract suspend fun deleteStale(trainerId: String, studentId: String)

    @Query("UPDATE trainer_sessions SET listed = 0 WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun unlist(trainerId: String, studentId: String)

    @Query("DELETE FROM trainer_sessions WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun deleteSession(trainerId: String, id: String)

    @Query("DELETE FROM trainer_sessions WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerSessions(trainerId: String)

    @Query("DELETE FROM trainer_sessions_sync WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerSync(trainerId: String)

    @Query("DELETE FROM trainer_sessions")
    abstract suspend fun clearSessions()

    @Query("DELETE FROM trainer_sessions_sync")
    abstract suspend fun clearSync()

    /** La página 1 nueva de un alumno: la lista vuelve a ser solo esa página. Las filas ya traen el detalle que se conserva. */
    @Transaction
    open suspend fun replaceLatest(sync: TrainerSessionsSyncEntity, sessions: List<TrainerSessionEntity>) {
        unlist(sync.trainerId, sync.studentId)
        upsertSessions(sessions)
        deleteStale(sync.trainerId, sync.studentId)
        upsertSync(sync)
    }

    /** Una página de "Ver más": se suma a la lista y avanza la paginación. */
    @Transaction
    open suspend fun appendPage(sync: TrainerSessionsSyncEntity, sessions: List<TrainerSessionEntity>) {
        upsertSessions(sessions)
        upsertSync(sync)
    }

    @Transaction
    open suspend fun clearOwner(trainerId: String) {
        clearOwnerSessions(trainerId)
        clearOwnerSync(trainerId)
    }

    @Transaction
    open suspend fun clear() {
        clearSessions()
        clearSync()
    }
}
