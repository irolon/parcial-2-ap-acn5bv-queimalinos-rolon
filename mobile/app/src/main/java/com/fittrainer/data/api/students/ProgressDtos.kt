package com.fittrainer.data.api.students

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** GET /students/:id/attendance?month=YYYY-MM. */
@Serializable
data class AttendanceResponse(val data: AttendanceDto)

@Serializable
data class AttendanceDto(
    val month: String,
    val sessions: Int,
    @SerialName("assigned_days") val assignedDays: Int,
    val prs: Int,
    val days: List<AttendanceDayDto>,
)

/** status: trained | missed | rest | upcoming. */
@Serializable
data class AttendanceDayDto(val date: String, val status: String)

/** GET /students/:id/streak. */
@Serializable
data class StreakResponse(val data: StreakDto)

@Serializable
data class StreakDto(
    @SerialName("current_streak_days") val currentDays: Int = 0,
    @SerialName("longest_streak_days") val longestDays: Int = 0,
)
