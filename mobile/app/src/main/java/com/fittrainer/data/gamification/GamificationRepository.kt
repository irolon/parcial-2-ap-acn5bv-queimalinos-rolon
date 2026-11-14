package com.fittrainer.data.gamification

import com.fittrainer.data.api.gamification.GamificationApi
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.db.gamification.CELEBRATION_PENDING
import com.fittrainer.data.db.gamification.CelebrationEntity
import com.fittrainer.data.db.gamification.GamificationDao
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.routine.RoutineCache
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.DayOfWeek
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Logros, racha y desafíos (tarjeta 15). Refresca Room desde la API y expone el resumen con la cuenta local
 * (spec §3.3): el ViewModel nunca ve Retrofit.
 */
@Singleton
class GamificationRepository @Inject constructor(
    private val api: GamificationApi,
    private val dao: GamificationDao,
    private val routines: RoutineRepository,
    /** Provider: la sesión depende de los UserDataCleaner (este repositorio entre ellos) y Hilt no admite el ciclo. */
    private val sessionProvider: Provider<SessionRepository>,
    private val clock: Clock,
) : UserDataCleaner, GamificationSyncHook {

    private val mutex = Mutex()

    /** Cuántos refrescos buenos hubo y de quién fue el último: quien esperaba el Mutex no repite uno recién hecho. */
    @Volatile private var successCount = 0L
    @Volatile private var successOwner: String? = null

    /** Sube con cada limpieza: un pedido que arrancó antes del logout no escribe aunque el token siga. */
    @Volatile private var clearGeneration = 0

    /** null: la cuenta nunca trajo la gamificación. */
    fun observeSummary(ownerId: String): Flow<GamificationSummary?> = combine(
        dao.observeSnapshot(ownerId),
        dao.observeAchievements(ownerId),
        dao.observeChallenges(ownerId),
        dao.observeFinishedSessions(ownerId),
        routines.observeCache(ownerId),
    ) { snapshot, achievements, challenges, finished, cache ->
        snapshot?.let {
            buildSummary(it.toDomain(), achievements.map { a -> a.toDomain() }, challenges.map { c -> c.toDomain() }, finished, cache.assignedDays(), today())
        }
    }

    /**
     * Si falla, Room queda como estaba y el error viaja en un [DataException]. Un pedido a la vez (Hoy, Progreso y el sync).
     * [force]: no se da por cubierto por un refresco que terminó mientras esperaba el Mutex (ese GET pudo arrancar antes
     * de que cambiara algo, como la subida de sesiones). Igual espera el turno, así que su GET arranca después del que volaba.
     */
    suspend fun refresh(ownerId: String, force: Boolean = false): Result<Unit> {
        val seen = successCount
        return mutex.withLock {
            if (!force && successCount != seen && successOwner == ownerId) return@withLock Result.success(Unit)
            val gen = clearGeneration
            guard { fetch(ownerId, gen) }.onSuccess {
                // Un logout en el medio dejó Room vacío: no lo marcamos como "recién refrescado".
                if (gen == clearGeneration) {
                    successOwner = ownerId
                    successCount++
                }
            }
        }
    }

    private suspend fun fetch(ownerId: String, gen: Int) {
        val (progress, challenges) = coroutineScope {
            val p = async { api.progress(ownerId).data }
            val c = async { api.challenges(ownerId).data }
            p.await() to c.await()
        }
        val now = clock.millis()
        val achievements = progress.achievements.mapIndexed { i, dto -> dto.toEntity(ownerId, i) }
        // Chequeo y escritura en la misma transacción: clearUserData no puede colarse entre los dos.
        dao.inTransaction {
            checkOwner(ownerId, gen)
            val previous = dao.snapshot(ownerId)
            val lockedBefore = dao.achievements(ownerId).filter { it.unlockedAt == null }.map { it.code }.toSet()
            dao.replace(progress.toSnapshotEntity(ownerId, now), achievements, challenges.map { it.toEntity(ownerId) })
            // Lo que otorgó el servidor por su cuenta (job diario, spec §3.4 caso 3): estaba bloqueado en los logros
            // guardados de la foto anterior y viene desbloqueado en la nueva (sin comparar relojes). La primera foto
            // de la cuenta no festeja, y un logro que no estaba en la foto anterior tampoco: se cuenta de menos.
            if (previous != null) {
                val fresh = achievements.filter { a -> a.unlockedAt != null && a.code in lockedBefore }
                dao.insertCelebrations(fresh.map { it.toCelebration(now) })
            }
        }
    }

    fun observePending(ownerId: String): Flow<List<Celebration>> = dao.observePending(ownerId).map { rows -> rows.map { it.toDomain() } }

    /** Emite cuando cambian la foto o las sesiones terminadas del celular: es cuando la cuenta local puede cumplir algo. */
    fun evaluationTriggers(ownerId: String): Flow<Unit> =
        combine(dao.observeSnapshot(ownerId), dao.observeFinishedSessions(ownerId)) { _, _ -> }

    /** Spec §3.4 caso 1: lo que la cuenta local ya cumple (sesiones y racha) queda por celebrar. Sin foto no se evalúa. */
    suspend fun evaluateLocal(ownerId: String) {
        val gen = clearGeneration
        val snapshot = dao.snapshot(ownerId)?.toDomain() ?: return
        val counts = localCounts(snapshot, dao.finishedSessions(ownerId), routines.observeCache(ownerId).first().assignedDays(), today())
        val rows = dao.achievements(ownerId)
        val unlocks = localUnlocks(rows.map { it.toDomain() }, counts).map { it.code }.toSet()
        if (unlocks.isEmpty()) return
        try {
            dao.inTransaction {
                checkOwner(ownerId, gen)
                dao.insertCelebrations(rows.filter { it.code in unlocks }.map { it.toCelebration(clock.millis()) })
            }
        } catch (e: AccountChangedException) {
            // Cerró sesión (o cambió de cuenta) mientras evaluábamos: no se anota nada.
        }
    }

    suspend fun markShown(ownerId: String, codes: List<String>) = dao.markShown(ownerId, codes)

    /** Spec §3.4 caso 2. Si ya no es la cuenta logueada (logout a mitad de la pasada), no se anota nada. */
    override suspend fun onUnlocked(ownerId: String, unlocked: List<UnlockedAchievement>) {
        if (unlocked.isEmpty()) return
        val gen = clearGeneration
        val catalog = dao.achievements(ownerId).associateBy { it.code }
        val now = clock.millis()
        try {
            dao.inTransaction {
                checkOwner(ownerId, gen)
                dao.insertCelebrations(
                    unlocked.map { CelebrationEntity(ownerId, it.code, it.name, catalog[it.code]?.description, it.category, CELEBRATION_PENDING, now) },
                )
            }
        } catch (e: AccountChangedException) {
            // Lo pendiente era de la cuenta anterior: se descarta.
        }
    }

    /** Spec §3.2: después de subir, la foto se refresca (si falla, la cuenta local cuenta de menos y no festeja de más). */
    override suspend fun afterUploads(ownerId: String) {
        // force: un GET que volaba durante la subida trae la foto sin esas sesiones; no puede darlo por hecho.
        refresh(ownerId, force = true)
    }

    override suspend fun clearUserData(ownerId: String?) {
        clearGeneration++
        successOwner = null
        if (ownerId == null) dao.clearAll() else dao.clear(ownerId)
    }

    private fun today(): LocalDate = businessDate(clock.millis())

    /** Una respuesta que volaba durante el logout (o un cambio de cuenta) no escribe filas del dueño anterior. */
    private suspend fun checkOwner(ownerId: String, gen: Int) {
        val current = (sessionProvider.get().session.first() as? Session.Student)?.user?.id
        if (current != ownerId || gen != clearGeneration) throw AccountChangedException()
    }

    private suspend fun <T> guard(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }
}

/** Unión de los días de las rutinas activas guardadas; vacía = sin rutina (todos los días cuentan). */
internal fun RoutineCache.assignedDays(): Set<DayOfWeek> = routines.flatMap { it.days }.toSet()
