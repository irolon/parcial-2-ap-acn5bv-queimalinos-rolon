package com.fittrainer.di

import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.progress.ProgressRepository
import com.fittrainer.data.session.UserDataCleaner
import com.fittrainer.data.workout.history.HistoryRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/**
 * Cachés que se borran al cerrar sesión y solo aportan su limpieza al set de [UserDataCleaner]: biblioteca, historial y
 * progreso. Rutinas y la cancelación del sync se registran en sus módulos, junto a sus otros bindings.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class CacheCleanersModule {
    @Binds
    @IntoSet
    abstract fun bindLibraryCleaner(impl: LibraryRepository): UserDataCleaner

    @Binds
    @IntoSet
    abstract fun bindHistoryCleaner(impl: HistoryRepository): UserDataCleaner

    @Binds
    @IntoSet
    abstract fun bindProgressCleaner(impl: ProgressRepository): UserDataCleaner
}
