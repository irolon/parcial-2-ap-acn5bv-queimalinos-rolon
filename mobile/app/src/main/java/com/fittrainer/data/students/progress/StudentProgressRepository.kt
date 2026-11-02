package com.fittrainer.data.students.progress

import com.fittrainer.data.api.students.AttendanceDayDto
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.db.students.progress.TrainerAttendanceDao
import com.fittrainer.data.db.students.progress.TrainerAttendanceEntity
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import retrofit2.HttpException

enum class DayStatus { TRAINED, MISSED, REST, UPCOMING }

data class DayMark(val date: LocalDate, val status: DayStatus)

/** El mes de un alumno: sesiones / días asignados hasta hoy, racha, PRs y cada día. */
data class MonthProgress(
    val month: YearMonth,
    val sessions: Int,
    val assignedDays: Int,
    val prs: Int,
    val streak: Int,
    val days: List<DayMark>,
    val fetchedAt: Instant,
)

private val json = Json { ignoreUnknownKeys = true }

private fun statusOf(raw: String) = when (raw) {
    "trained" -> DayStatus.TRAINED
    "missed" -> DayStatus.MISSED
    "rest" -> DayStatus.REST
    else -> DayStatus.UPCOMING
}

/**
 * Resumen y asistencia mensual de un alumno visto por su entrenador. Offline-first: la UI observa
 * Room; refreshMonth pide asistencia y racha en paralelo y guarda las dos juntas, o nada.
 */
@Singleton
class StudentProgressRepository @Inject constructor(
    private val api: StudentsApi,
    private val dao: TrainerAttendanceDao,
    private val clock: Clock,
) : UserDataCleaner {

    fun observeMonth(trainerId: String, studentId: String, month: YearMonth): Flow<MonthProgress?> =
        dao.observe(trainerId, studentId, month.toString()).map { it?.toDomain() }.distinctUntilChanged()

    suspend fun refreshMonth(trainerId: String, studentId: String, month: YearMonth): Result<Unit> = try {
        coroutineScope {
            val attendance = async { api.attendance(studentId, month.toString()).data }
            val streak = async { api.streak(studentId).data }
            val a = attendance.await()
            dao.upsert(
                TrainerAttendanceEntity(
                    trainerId, studentId, month.toString(), a.sessions, a.assignedDays, a.prs,
                    streakDays = streak.await().currentDays,
                    daysJson = json.encodeToString(a.days),
                    fetchedAt = clock.millis(),
                ),
            )
        }
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        Result.failure(DataException(if (e.code() == 403 || e.code() == 404) DataError.NotFound else e.toDataError(), e))
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }

    private fun TrainerAttendanceEntity.toDomain() = MonthProgress(
        month = YearMonth.parse(month),
        sessions = sessions,
        assignedDays = assignedDays,
        prs = prs,
        streak = streakDays,
        days = runCatching { json.decodeFromString<List<AttendanceDayDto>>(daysJson) }.getOrDefault(emptyList())
            .map { DayMark(LocalDate.parse(it.date), statusOf(it.status)) },
        fetchedAt = Instant.ofEpochMilli(fetchedAt),
    )
}
