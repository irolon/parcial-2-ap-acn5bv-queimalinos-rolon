package com.fittrainer.data.db.database

import com.fittrainer.data.db.agenda.TrainerAgendaDao
import com.fittrainer.data.db.challenges.trainer.TrainerChallengesDao
import com.fittrainer.data.db.exercises.trainer.TrainerExercisesDao
import com.fittrainer.data.db.messages.trainer.TrainerMessagesDao
import com.fittrainer.data.db.routines.trainer.TrainerRoutinesDao
import com.fittrainer.data.db.students.TrainerStudentDetailDao
import com.fittrainer.data.db.students.TrainerStudentsDao
import com.fittrainer.data.db.students.metrics.TrainerStudentMetricsDao
import com.fittrainer.data.db.students.overview.TrainerOverviewDao
import com.fittrainer.data.db.students.progress.TrainerAttendanceDao
import com.fittrainer.data.db.students.sessions.TrainerSessionsDao
import com.fittrainer.data.db.templates.trainer.TrainerTemplatesDao

/** Los DAO del rol entrenador. FitTrainerDatabase los implementa (Room genera los getters igual que los propios). */
interface TrainerDaos {
    fun trainerStudentsDao(): TrainerStudentsDao
    fun trainerStudentDetailDao(): TrainerStudentDetailDao
    fun trainerSessionsDao(): TrainerSessionsDao
    fun trainerAttendanceDao(): TrainerAttendanceDao
    fun trainerStudentMetricsDao(): TrainerStudentMetricsDao
    fun trainerOverviewDao(): TrainerOverviewDao
    fun trainerRoutinesDao(): TrainerRoutinesDao
    fun trainerExercisesDao(): TrainerExercisesDao
    fun trainerTemplatesDao(): TrainerTemplatesDao
    fun trainerChallengesDao(): TrainerChallengesDao
    fun trainerMessagesDao(): TrainerMessagesDao
    fun trainerAgendaDao(): TrainerAgendaDao
}
