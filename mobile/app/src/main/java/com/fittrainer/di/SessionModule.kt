package com.fittrainer.di

import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.TokenSessionRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class SessionModule {

    @Binds
    @Singleton
    abstract fun bindSessionRepository(impl: TokenSessionRepository): SessionRepository
}
