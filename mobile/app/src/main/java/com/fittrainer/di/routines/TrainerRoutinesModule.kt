package com.fittrainer.di.routines

import com.fittrainer.data.exercises.trainer.TrainerExercisesRepository
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** Rutinas y catálogo de ejercicios del entrenador (E8): sus cachés también se borran al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class TrainerRoutinesModule {

    @Binds
    @IntoSet
    abstract fun bindTrainerRoutinesCleaner(impl: TrainerRoutinesRepository): UserDataCleaner

    @Binds
    @IntoSet
    abstract fun bindTrainerExercisesCleaner(impl: TrainerExercisesRepository): UserDataCleaner
}
