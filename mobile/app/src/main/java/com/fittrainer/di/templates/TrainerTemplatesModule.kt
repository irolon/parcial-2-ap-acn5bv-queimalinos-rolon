package com.fittrainer.di.templates

import com.fittrainer.data.session.UserDataCleaner
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** Plantillas del entrenador (E9): su caché también se borra al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class TrainerTemplatesModule {

    @Binds
    @IntoSet
    abstract fun bindTrainerTemplatesCleaner(impl: TrainerTemplatesRepository): UserDataCleaner
}
