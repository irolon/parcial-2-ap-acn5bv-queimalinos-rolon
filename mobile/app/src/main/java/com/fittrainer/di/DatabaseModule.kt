package com.fittrainer.di

import android.content.Context
import android.util.Log
import androidx.room.Room
import com.fittrainer.data.db.FitTrainerDatabase
import com.fittrainer.data.db.HealthDao
import com.fittrainer.data.db.library.LibraryDao
import com.fittrainer.data.db.notifications.NotificationDao
import com.fittrainer.data.db.progress.ProgressDao
import com.fittrainer.data.db.routine.RoutineDao
import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.db.workout.history.HistoryDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.time.Clock
import javax.inject.Qualifier
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/** El único scope que vive lo que el proceso: para trabajo que tiene que sobrevivir a un servicio o una pantalla. */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class ApplicationScope

/** Room y sus DAO, más lo que es uno solo por proceso: el reloj y el [ApplicationScope]. */
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
    fun provideHistoryDao(db: FitTrainerDatabase): HistoryDao = db.historyDao()

    @Provides
    fun provideProgressDao(db: FitTrainerDatabase): ProgressDao = db.progressDao()

    @Provides
    fun provideNotificationDao(db: FitTrainerDatabase): NotificationDao = db.notificationDao()

    @Provides
    @Singleton
    fun provideClock(): Clock = Clock.systemDefaultZone()

    @Provides
    @Singleton
    @ApplicationScope
    fun provideApplicationScope(): CoroutineScope = CoroutineScope(
        SupervisorJob() + Dispatchers.IO +
            CoroutineExceptionHandler { _, e -> Log.e("ApplicationScope", "Falló una tarea de fondo", e) },
    )
}
