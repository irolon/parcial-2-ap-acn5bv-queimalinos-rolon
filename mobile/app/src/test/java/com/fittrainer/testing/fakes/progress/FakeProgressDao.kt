package com.fittrainer.testing.fakes.progress

import com.fittrainer.data.db.progress.ProgressBodyMetaEntity
import com.fittrainer.data.db.progress.ProgressBodyPointEntity
import com.fittrainer.data.db.progress.ProgressDao
import com.fittrainer.data.db.progress.ProgressExerciseMetaEntity
import com.fittrainer.data.db.progress.ProgressExercisePointEntity
import com.fittrainer.data.db.progress.TrainedExercise
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Caché de progreso en memoria. Los ejercicios entrenados se cargan a mano en [trained] (en Room salen del historial). */
open class FakeProgressDao : ProgressDao() {
    data class State(
        val points: List<ProgressExercisePointEntity> = emptyList(),
        val metas: List<ProgressExerciseMetaEntity> = emptyList(),
        val body: List<ProgressBodyPointEntity> = emptyList(),
        val bodyMetas: List<ProgressBodyMetaEntity> = emptyList(),
    )

    val state = MutableStateFlow(State())

    /** Ejercicios entrenados por dueño. */
    val trained = MutableStateFlow<Map<String, List<TrainedExercise>>>(emptyMap())

    /** Como Room: una transaccion a la vez; clear y clearAll esperan a la abierta. */
    private val txLock = Mutex()

    override suspend fun inTransaction(block: suspend () -> Unit) = txLock.withLock { block() }

    override suspend fun clear(ownerId: String) = txLock.withLock { super.clear(ownerId) }

    override suspend fun clearAll() = txLock.withLock { super.clearAll() }

    override fun observeTrainedExercises(ownerId: String): Flow<List<TrainedExercise>> =
        trained.map { m -> (m[ownerId] ?: emptyList()).sortedByDescending { it.lastTrainedAt } }

    override suspend fun lastTrainedAt(ownerId: String, exerciseId: String): Long? =
        trained.value[ownerId]?.filter { it.exerciseId == exerciseId }?.maxOfOrNull { it.lastTrainedAt }

    override fun observePoints(ownerId: String, exerciseId: String): Flow<List<ProgressExercisePointEntity>> =
        state.map { st -> st.points.filter { it.ownerId == ownerId && it.exerciseId == exerciseId }.sortedBy { it.date } }

    override fun observeMeta(ownerId: String, exerciseId: String): Flow<ProgressExerciseMetaEntity?> =
        state.map { st -> st.metas.firstOrNull { it.ownerId == ownerId && it.exerciseId == exerciseId } }

    override suspend fun meta(ownerId: String, exerciseId: String) =
        state.value.metas.firstOrNull { it.ownerId == ownerId && it.exerciseId == exerciseId }

    override suspend fun upsertMeta(meta: ProgressExerciseMetaEntity) = state.update { st ->
        st.copy(metas = st.metas.filterNot { it.ownerId == meta.ownerId && it.exerciseId == meta.exerciseId } + meta)
    }

    override suspend fun insertPoints(points: List<ProgressExercisePointEntity>) = state.update { it.copy(points = it.points + points) }

    override suspend fun deletePoints(ownerId: String, exerciseId: String) = state.update { st ->
        st.copy(points = st.points.filterNot { it.ownerId == ownerId && it.exerciseId == exerciseId })
    }

    override suspend fun deleteMeta(ownerId: String, exerciseId: String) = state.update { st ->
        st.copy(metas = st.metas.filterNot { it.ownerId == ownerId && it.exerciseId == exerciseId })
    }

    override fun observeBody(ownerId: String): Flow<List<ProgressBodyPointEntity>> =
        state.map { st -> st.body.filter { it.ownerId == ownerId }.sortedWith(compareBy({ it.recordedAt }, { it.id })) }

    override suspend fun bodyMeta(ownerId: String) = state.value.bodyMetas.firstOrNull { it.ownerId == ownerId }

    override fun observeBodyMeta(ownerId: String): Flow<ProgressBodyMetaEntity?> =
        state.map { st -> st.bodyMetas.firstOrNull { it.ownerId == ownerId } }

    override suspend fun deleteBodyPoints(ownerId: String) = state.update { st -> st.copy(body = st.body.filterNot { it.ownerId == ownerId }) }

    override suspend fun insertBodyPoints(points: List<ProgressBodyPointEntity>) = state.update { it.copy(body = it.body + points) }

    override suspend fun upsertBodyMeta(meta: ProgressBodyMetaEntity) = state.update { st ->
        st.copy(bodyMetas = st.bodyMetas.filterNot { it.ownerId == meta.ownerId } + meta)
    }

    override suspend fun deleteAllPoints(ownerId: String) = state.update { st -> st.copy(points = st.points.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteAllMeta(ownerId: String) = state.update { st -> st.copy(metas = st.metas.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteBodyMeta(ownerId: String) = state.update { st -> st.copy(bodyMetas = st.bodyMetas.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteEveryPoint() = state.update { it.copy(points = emptyList()) }
    override suspend fun deleteEveryMeta() = state.update { it.copy(metas = emptyList()) }
    override suspend fun deleteEveryBodyPoint() = state.update { it.copy(body = emptyList()) }
    override suspend fun deleteEveryBodyMeta() = state.update { it.copy(bodyMetas = emptyList()) }
}
