package com.fittrainer.di

import android.content.Context
import androidx.room.Room
import com.fittrainer.data.db.FitTrainerDatabase
import com.fittrainer.data.db.HealthDao
import com.fittrainer.data.db.library.LibraryDao
import com.fittrainer.data.db.routine.RoutineDao
import com.fittrainer.data.db.workout.WorkoutDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.time.Clock
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): FitTrainerDatabase =
        // Sin fallbackToDestructiveMigration: las versiones se migran (ver FitTrainerDatabase).
        Room.databaseBuilder(context, FitTrainerDatabase::class.java, "fittrainer.db").build()

    @Provides
    fun provideHealthDao(db: FitTrainerDatabase): HealthDao = db.healthDao()

    @Provides
    fun provideRoutineDao(db: FitTrainerDatabase): RoutineDao = db.routineDao()

    @Provides
    fun provideLibraryDao(db: FitTrainerDatabase): LibraryDao = db.libraryDao()

    @Provides
    fun provideWorkoutDao(db: FitTrainerDatabase): WorkoutDao = db.workoutDao()

    @Provides
    @Singleton
    fun provideClock(): Clock = Clock.systemDefaultZone()
}
