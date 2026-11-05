package com.fittrainer.di.agenda

import com.fittrainer.data.agenda.student.StudentAppointmentsRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** Turnos del alumno (tarjeta 16): sus turnos y los horarios libres también se borran al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class StudentAgendaModule {

    @Binds
    @IntoSet
    abstract fun bindStudentAgendaCleaner(impl: StudentAppointmentsRepository): UserDataCleaner
}
