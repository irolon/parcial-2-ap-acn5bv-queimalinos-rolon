package com.fittrainer.di.students

import com.fittrainer.data.session.UserDataCleaner
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.students.metrics.StudentMetricsRepository
import com.fittrainer.data.students.progress.StudentProgressRepository
import com.fittrainer.data.students.sessions.StudentSessionsRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** App del entrenador: sus cachés también se borran al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class StudentsModule {

    @Binds
    @IntoSet
    abstract fun bindTrainerStudentsCleaner(impl: TrainerStudentsRepository): UserDataCleaner

    @Binds
    @IntoSet
    abstract fun bindTrainerStudentDetailCleaner(impl: TrainerStudentDetailRepository): UserDataCleaner

    @Binds
    @IntoSet
    abstract fun bindStudentSessionsCleaner(impl: StudentSessionsRepository): UserDataCleaner

    @Binds
    @IntoSet
    abstract fun bindStudentProgressCleaner(impl: StudentProgressRepository): UserDataCleaner

    @Binds
    @IntoSet
    abstract fun bindStudentMetricsCleaner(impl: StudentMetricsRepository): UserDataCleaner
}
