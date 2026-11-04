package com.fittrainer.di.messages

import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** Mensajes del entrenador (E11): su caché también se borra al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class TrainerMessagesModule {

    @Binds
    @IntoSet
    abstract fun bindTrainerMessagesCleaner(impl: TrainerMessagesRepository): UserDataCleaner
}
