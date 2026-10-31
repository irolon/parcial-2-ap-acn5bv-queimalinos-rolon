package com.fittrainer.di

import com.fittrainer.data.session.UserDataCleaner
import com.fittrainer.data.workout.history.HistoryRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** El historial es caché: se borra al cerrar sesión, como rutinas y biblioteca. */
@Module
@InstallIn(SingletonComponent::class)
abstract class HistoryModule {
    @Binds
    @IntoSet
    abstract fun bindHistoryCleaner(impl: HistoryRepository): UserDataCleaner
}
