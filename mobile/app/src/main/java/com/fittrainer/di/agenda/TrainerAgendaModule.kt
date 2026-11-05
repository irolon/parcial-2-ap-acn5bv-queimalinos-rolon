package com.fittrainer.di.agenda

import com.fittrainer.data.agenda.TrainerAgendaRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** Agenda del entrenador (E13): su caché también se borra al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class TrainerAgendaModule {

    @Binds
    @IntoSet
    abstract fun bindTrainerAgendaCleaner(impl: TrainerAgendaRepository): UserDataCleaner
}
