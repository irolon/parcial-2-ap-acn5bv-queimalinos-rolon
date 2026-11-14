package com.fittrainer.di.trainerai

import com.fittrainer.BuildConfig
import com.fittrainer.data.api.trainerai.TrainerAiApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Lo que espera el celular una propuesta: el backend le da 38 s a n8n y además consulta Supabase antes y guarda después. */
const val TRAINER_AI_TIMEOUT_SECONDS = 50L

/** Asistente IA del entrenador (E15): el mismo cliente con Bearer y refresh, con un tope de 50 s por llamada. */
@Module
@InstallIn(SingletonComponent::class)
object TrainerAiModule {

    @Provides
    @Singleton
    fun provideTrainerAiApi(client: OkHttpClient, json: Json): TrainerAiApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(
            client.newBuilder()
                .callTimeout(TRAINER_AI_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(TRAINER_AI_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .build(),
        )
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(TrainerAiApi::class.java)
}
