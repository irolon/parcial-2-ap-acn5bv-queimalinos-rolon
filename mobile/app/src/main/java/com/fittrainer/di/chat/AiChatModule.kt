package com.fittrainer.di.chat

import com.fittrainer.BuildConfig
import com.fittrainer.data.chat.AiChatRepository
import com.fittrainer.data.api.chat.AiChatApi
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Lo que espera el celular una respuesta del asistente (el backend corta a los 16 s). */
const val AI_CHAT_TIMEOUT_SECONDS = 20L

/**
 * Chat IA del alumno (tarjeta 14): el mismo cliente con Bearer y refresh, pero con un tope total de 20 s por llamada
 * (callTimeout) en vez del API_TIMEOUT_SECONDS general.
 */
@Module
@InstallIn(SingletonComponent::class)
object AiChatModule {

    @Provides
    @Singleton
    fun provideAiChatApi(client: OkHttpClient, json: Json): AiChatApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(
            client.newBuilder()
                .callTimeout(AI_CHAT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(AI_CHAT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .build(),
        )
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(AiChatApi::class.java)
}

/** El chat IA del día también se borra al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class AiChatCleanerModule {
    @Binds
    @IntoSet
    abstract fun bindAiChatCleaner(impl: AiChatRepository): UserDataCleaner
}
