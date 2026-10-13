package com.fittrainer.di

import android.content.Context
import androidx.room.Room
import com.fittrainer.data.db.FitTrainerDatabase
import com.fittrainer.data.db.HealthDao
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
        Room.databaseBuilder(context, FitTrainerDatabase::class.java, "fittrainer.db").build()

    @Provides
    fun provideHealthDao(db: FitTrainerDatabase): HealthDao = db.healthDao()

    @Provides
    @Singleton
    fun provideClock(): Clock = Clock.systemDefaultZone()
}
