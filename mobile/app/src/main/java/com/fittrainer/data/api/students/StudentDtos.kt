package com.fittrainer.data.api.students

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class StudentListResponse(
    val data: List<StudentListItemDto> = emptyList(),
    val meta: PageMetaDto = PageMetaDto(),
)

@Serializable
data class PageMetaDto(
    val total: Int = 0,
    val page: Int = 1,
    @SerialName("total_pages") val totalPages: Int = 0,
)

/** Fila de GET /students. adherence_7d y days_per_week llegaron el 01/11: un backend viejo no los manda. */
@Serializable
data class StudentListItemDto(
    val id: String,
    val name: String,
    val email: String,
    val goal: String? = null,
    val active: Boolean = true,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("last_session_at") val lastSessionAt: String? = null,
    @SerialName("days_per_week") val daysPerWeek: Int = 0,
    @SerialName("adherence_7d") val adherence: AdherenceDto? = null,
)

@Serializable
data class AdherenceDto(val assigned: Int, val done: Int, val pct: Int? = null)
