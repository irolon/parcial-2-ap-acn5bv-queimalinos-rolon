package com.fittrainer.di

import com.fittrainer.data.progress.ProgressRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** El caché de progreso se borra al cerrar sesión, como el historial. */
@Module
@InstallIn(SingletonComponent::class)
abstract class ProgressModule {
    @Binds
    @IntoSet
    abstract fun bindProgressCleaner(impl: ProgressRepository): UserDataCleaner
}
