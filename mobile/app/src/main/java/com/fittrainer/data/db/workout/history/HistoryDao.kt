package com.fittrainer.data.db.workout.history

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Caché del historial (tarjeta 12). Todo por dueño: otra cuenta en el mismo celular no ve nada ajeno. */
@Dao
abstract class HistoryDao {

    @Query("SELECT * FROM history_sessions WHERE ownerId = :ownerId ORDER BY startedAt DESC, id DESC")
    abstract fun observeSessions(ownerId: String): Flow<List<HistorySessionEntity>>

    @Transaction
    @Query("SELECT * FROM history_sessions WHERE ownerId = :ownerId AND id = :id")
    abstract fun observeDetail(ownerId: String, id: String): Flow<HistoryWithDetails?>

    @Query("SELECT * FROM history_sessions WHERE ownerId = :ownerId")
    abstract suspend fun sessions(ownerId: String): List<HistorySessionEntity>

    @Upsert
    abstract suspend fun upsertSessions(sessions: List<HistorySessionEntity>)

    /** "Ver más": las que ya están (entre las 20) no se tocan. */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    abstract suspend fun insertIfAbsent(sessions: List<HistorySessionEntity>)

    @Query("DELETE FROM history_sessions WHERE ownerId = :ownerId AND id NOT IN (:keep)")
    abstract suspend fun deleteOthers(ownerId: String, keep: List<String>)

    @Query("DELETE FROM history_exercises WHERE sessionId = :sessionId")
    abstract suspend fun deleteExercises(sessionId: String)

    @Query("DELETE FROM history_sets WHERE sessionId = :sessionId")
    abstract suspend fun deleteSets(sessionId: String)

    @Insert
    abstract suspend fun insertExercises(exercises: List<HistoryExerciseEntity>)

    @Insert
    abstract suspend fun insertSets(sets: List<HistorySetEntity>)

    @Query("UPDATE history_sessions SET detailLoaded = 1 WHERE id = :sessionId")
    abstract suspend fun markDetailLoaded(sessionId: String)

    @Query(
        "SELECT COUNT(*) FROM history_sessions s WHERE s.ownerId = :ownerId AND TRIM(IFNULL(s.trainerComment, '')) != '' " +
            "AND NOT EXISTS (SELECT 1 FROM history_comment_seen c WHERE c.sessionId = s.id AND c.ownerId = :ownerId AND c.comment = s.trainerComment)",
    )
    abstract fun observeUnreadCount(ownerId: String): Flow<Int>

    @Query("SELECT * FROM history_comment_seen WHERE ownerId = :ownerId")
    abstract fun observeSeen(ownerId: String): Flow<List<HistoryCommentSeenEntity>>

    @Upsert
    abstract suspend fun markSeen(seen: HistoryCommentSeenEntity)

    @Query("DELETE FROM history_sessions WHERE ownerId = :ownerId")
    abstract suspend fun deleteSessions(ownerId: String)

    @Query("DELETE FROM history_comment_seen WHERE ownerId = :ownerId")
    abstract suspend fun deleteSeen(ownerId: String)

    @Query("DELETE FROM history_sessions")
    abstract suspend fun deleteAllSessions()

    @Query("DELETE FROM history_comment_seen")
    abstract suspend fun deleteAllSeen()

    /** Logout: se va el caché del dueño y también lo que ya leyó. */
    @Transaction
    open suspend fun clear(ownerId: String) {
        deleteSessions(ownerId)
        deleteSeen(ownerId)
    }

    @Transaction
    open suspend fun clearAll() {
        deleteAllSessions()
        deleteAllSeen()
    }

    /** Corre el bloque en una sola transacción de Room: las escrituras de otra transacción esperan a que cierre. */
    @Transaction
    open suspend fun inTransaction(block: suspend () -> Unit) = block()

    /** Las 20 más recientes reemplazan al caché del dueño (las de "Ver más" se van). Upsert: no borra el detalle. */
    @Transaction
    open suspend fun replaceLatest(ownerId: String, latest: List<HistorySessionEntity>) {
        deleteOthers(ownerId, latest.map { it.id })
        upsertSessions(latest)
    }

    /** Ejercicios y series de una sesión, de una vez. */
    @Transaction
    open suspend fun replaceDetail(sessionId: String, exercises: List<HistoryExerciseEntity>, sets: List<HistorySetEntity>) {
        deleteExercises(sessionId)
        deleteSets(sessionId)
        insertExercises(exercises)
        insertSets(sets)
        markDetailLoaded(sessionId)
    }
}
