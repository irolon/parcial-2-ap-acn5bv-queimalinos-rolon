package com.fittrainer.di

import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

@Module
@InstallIn(SingletonComponent::class)
abstract class LibraryModule {

    @Binds
    @IntoSet
    abstract fun bindLibraryCleaner(impl: LibraryRepository): UserDataCleaner
}
