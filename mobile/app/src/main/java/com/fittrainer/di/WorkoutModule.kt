package com.fittrainer.di

import com.fittrainer.data.workout.IdGenerator
import com.fittrainer.data.workout.UuidGenerator
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/** Las sesiones NO se registran como UserDataCleaner: no son caché, son entrenamientos sin subir (spec §4). */
@Module
@InstallIn(SingletonComponent::class)
abstract class WorkoutModule {

    @Binds
    abstract fun bindIdGenerator(impl: UuidGenerator): IdGenerator
}
