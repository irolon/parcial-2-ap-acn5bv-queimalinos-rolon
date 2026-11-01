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

    /** "Ver más": las que ya están no se pisan (las de fuera de las 20 se actualizan aparte, con upsertSessions). */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    abstract suspend fun insertIfAbsent(sessions: List<HistorySessionEntity>)

    @Query("DELETE FROM history_sessions WHERE ownerId = :ownerId AND id NOT IN (:keep)")
    abstract suspend fun deleteOthers(ownerId: String, keep: List<String>)

    /** Las que no vinieron pero caen dentro de la ventana (orden startedAt DESC, id DESC) hasta la más vieja que vino. */
    @Query(
        "DELETE FROM history_sessions WHERE ownerId = :ownerId AND id NOT IN (:keep) " +
            "AND (startedAt > :oldestStartedAt OR (startedAt = :oldestStartedAt AND id > :oldestId))",
    )
    abstract suspend fun deleteOthersInWindow(ownerId: String, keep: List<String>, oldestStartedAt: Long, oldestId: String)

    @Query("UPDATE history_sessions SET inLatest = 0 WHERE ownerId = :ownerId AND id NOT IN (:keep)")
    abstract suspend fun markOutOfLatest(ownerId: String, keep: List<String>)

    /** ¿Esa sesión está guardada para ese dueño? (al tocar un aviso de comentario, tarjeta 17) */
    @Query("SELECT EXISTS(SELECT 1 FROM history_sessions WHERE ownerId = :ownerId AND id = :sessionId)")
    abstract suspend fun hasSession(ownerId: String, sessionId: String): Boolean

    @Query("SELECT EXISTS(SELECT 1 FROM history_sessions WHERE id = :sessionId)")
    abstract suspend fun exists(sessionId: String): Boolean

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

    /**
     * Las 20 más recientes pisan al caché del dueño (upsert: no borra el detalle). Solo se borran las que caen dentro
     * de esa ventana y ya no vinieron (se borraron en el servidor); las más viejas, las de "Ver más", quedan hasta el
     * logout. Si [complete] (el servidor no tiene más que estas) o no vino ninguna, se borran todas las que no vinieron.
     * Si ninguna de las que vinieron estaba guardada (entraron más de 20 nuevas), también: entre las nuevas y las
     * guardadas puede haber un hueco que el cursor de "Ver más" no pediría nunca.
     */
    @Transaction
    open suspend fun replaceLatest(ownerId: String, latest: List<HistorySessionEntity>, complete: Boolean) {
        val keep = latest.map { it.id }
        val oldest = latest.minWithOrNull(compareBy<HistorySessionEntity> { it.startedAt }.thenBy { it.id })
        val known = sessions(ownerId).map { it.id }.toSet()
        val gap = known.isNotEmpty() && keep.none { it in known }
        if (complete || oldest == null || gap) deleteOthers(ownerId, keep) else deleteOthersInWindow(ownerId, keep, oldest.startedAt, oldest.id)
        markOutOfLatest(ownerId, keep)
        upsertSessions(latest)
    }

    /** Ejercicios y series de una sesión, de una vez. Si la sesión ya no está en el caché no escribe nada y devuelve false. */
    @Transaction
    open suspend fun replaceDetail(sessionId: String, exercises: List<HistoryExerciseEntity>, sets: List<HistorySetEntity>): Boolean {
        if (!exists(sessionId)) return false
        deleteExercises(sessionId)
        deleteSets(sessionId)
        insertExercises(exercises)
        insertSets(sets)
        markDetailLoaded(sessionId)
        return true
    }
}
