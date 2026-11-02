package com.fittrainer.ui.templates.trainer

import com.fittrainer.data.students.TrainerStudent
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.students.detail.asListStudent
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.onStart

/**
 * El alumno de la ficha, en el modo "para un alumno" (E9). Sale de la lista de Alumnos o, si esa lista
 * todavía no se bajó (se llegó por Inicio), de la ficha que ya está en Room. Sin [studentId], null.
 */
@OptIn(ExperimentalCoroutinesApi::class)
fun fixedStudent(
    trainerId: Flow<String?>,
    studentId: String?,
    students: TrainerStudentsRepository,
    details: TrainerStudentDetailRepository,
): Flow<TrainerStudent?> = if (studentId == null) flowOf(null) else trainerId.filterNotNull().flatMapLatest { t ->
    combine(students.observe(t), details.observe(t, studentId)) { list, detail ->
        list.students.firstOrNull { it.id == studentId } ?: detail?.detail?.asListStudent()
    }
}.onStart { emit(null) }
