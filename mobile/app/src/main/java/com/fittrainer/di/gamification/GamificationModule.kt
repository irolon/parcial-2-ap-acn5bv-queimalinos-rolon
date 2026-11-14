package com.fittrainer.di.gamification

import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.gamification.GamificationSyncHook
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** La gamificación se borra al cerrar sesión, como el historial y el progreso. */
@Module
@InstallIn(SingletonComponent::class)
abstract class GamificationModule {
    @Binds
    @IntoSet
    abstract fun bindGamificationCleaner(impl: GamificationRepository): UserDataCleaner

    @Binds
    abstract fun bindGamificationSyncHook(impl: GamificationRepository): GamificationSyncHook
}
