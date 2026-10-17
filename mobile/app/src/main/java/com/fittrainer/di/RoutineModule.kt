package com.fittrainer.di

import com.fittrainer.data.network.AndroidConnectivityObserver
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class RoutineModule {

    @Binds
    abstract fun bindConnectivityObserver(impl: AndroidConnectivityObserver): ConnectivityObserver

    @Binds
    abstract fun bindUserDataCleaner(impl: RoutineRepository): UserDataCleaner
}
