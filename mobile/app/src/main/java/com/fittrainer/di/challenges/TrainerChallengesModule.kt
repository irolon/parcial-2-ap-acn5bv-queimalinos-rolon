package com.fittrainer.di.challenges

import com.fittrainer.data.challenges.trainer.TrainerChallengesRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** Desafíos del entrenador (E14): su caché también se borra al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class TrainerChallengesModule {

    @Binds
    @IntoSet
    abstract fun bindTrainerChallengesCleaner(impl: TrainerChallengesRepository): UserDataCleaner
}
