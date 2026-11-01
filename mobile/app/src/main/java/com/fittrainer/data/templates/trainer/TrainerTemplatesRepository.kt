package com.fittrainer.data.templates.trainer

import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.api.templates.FromRoutineRequest
import com.fittrainer.data.api.templates.InstantiateRequest
import com.fittrainer.data.api.templates.TrainerTemplatesApi
import com.fittrainer.data.db.templates.trainer.TrainerTemplatesDao
import com.fittrainer.data.db.templates.trainer.TrainerTemplatesSyncEntity
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.routines.trainer.RoutineRejectedException
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.routines.trainer.orThrow
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import retrofit2.HttpException

/**
 * Plantillas del entrenador (E9), offline-first: la lista y el detalle salen de Room. Asignar (instantiate,
 * una copia según el ADR 0003) y guardar una rutina como plantilla son solo online.
 */
@Singleton
class TrainerTemplatesRepository @Inject constructor(
    private val api: TrainerTemplatesApi,
    private val dao: TrainerTemplatesDao,
    private val routines: TrainerRoutinesRepository,
    private val clock: Clock,
) : UserDataCleaner {

    /** null = la lista nunca se bajó. */
    fun observeList(trainerId: String): Flow<TemplatesCache?> =
        combine(dao.observeAll(trainerId), dao.observeSync(trainerId)) { rows, sync ->
            sync?.let { TemplatesCache(rows.map { it.toSummary() }, Instant.ofEpochMilli(it.fetchedAt)) }
        }.distinctUntilChanged()

    /** null = no está en el caché o su detalle nunca se bajó. */
    fun observeTemplate(trainerId: String, id: String): Flow<TemplateDetail?> =
        dao.observe(trainerId, id).map { it?.toDetail() }.distinctUntilChanged()

    suspend fun refreshList(trainerId: String): Result<Unit> = call(trainerId, null) {
        dao.replaceAll(TrainerTemplatesSyncEntity(trainerId, clock.millis()), api.list().data.map { it.toEntity(trainerId) })
    }

    suspend fun refreshTemplate(trainerId: String, id: String): Result<Unit> = call(trainerId, id) {
        dao.upsert(listOf(api.get(id).data.toEntity(trainerId)))
    }

    /**
     * Asigna la plantilla al alumno con [name] y [days] (en orden de la semana). Devuelve el id de la rutina
     * nueva, que ya queda en el caché de rutinas (el editor la abre sin esperar).
     */
    suspend fun instantiate(trainerId: String, templateId: String, studentId: String, name: String, days: List<String>): Result<String> =
        call(trainerId, templateId) {
            val detail = api.instantiate(templateId, InstantiateRequest(studentId, name, days)).data
            routines.store(trainerId, detail)
            detail.id
        }

    /** Guarda una rutina como plantilla; después refresca la lista (si eso falla, igual salió bien). */
    suspend fun saveFromRoutine(trainerId: String, routineId: String, name: String, level: String?): Result<Unit> =
        call(trainerId, null) {
            api.fromRoutine(FromRoutineRequest(routineId, name, level)).orThrow()
            refreshList(trainerId)
            Unit
        }

    /**
     * 404 → la plantilla ya no existe: sale del caché y NotFound. 403 → el alumno (o la rutina) ya no es del
     * entrenador: Http(403). 409 → TemplateRejectedException con el mensaje del backend. 400 → por campo.
     */
    private suspend fun <T> call(trainerId: String, templateId: String?, block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        Result.failure(
            when (e.code()) {
                404 -> {
                    templateId?.let { dao.forget(trainerId, it) }
                    DataException(DataError.NotFound, e)
                }
                409 -> TemplateRejectedException(e.errorEnvelope()?.message ?: "No se pudo asignar la plantilla")
                400 -> e.errorEnvelope()?.let { env ->
                    RoutineRejectedException(env.details.mapNotNull { d -> d.field?.let { it to d.message.orEmpty() } }.toMap(), env.message)
                } ?: DataException(DataError.Http(400), e)
                else -> DataException(e.toDataError(), e)
            },
        )
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}
