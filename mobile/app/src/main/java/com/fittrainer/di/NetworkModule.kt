package com.fittrainer.di

import com.fittrainer.BuildConfig
import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.ExerciseApi
import com.fittrainer.data.api.FitTrainerApi
import com.fittrainer.data.api.InvitationApi
import com.fittrainer.data.api.RoutineApi
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.invitation.TrainerInvitationApi
import com.fittrainer.data.api.exercises.TrainerExercisesApi
import com.fittrainer.data.api.routines.TrainerRoutinesApi
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.api.templates.TrainerTemplatesApi
import com.fittrainer.data.api.challenges.TrainerChallengesApi
import com.fittrainer.data.auth.AuthInterceptor
import com.fittrainer.data.auth.TokenAuthenticator
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Qualifier
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Cliente sin Bearer automático ni Authenticator: lo usa AuthApi, así el refresh nunca dispara otro refresh. */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class AuthClient

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json { ignoreUnknownKeys = true }

    @Provides
    @Singleton
    fun provideOkHttp(authInterceptor: AuthInterceptor, authenticator: TokenAuthenticator): OkHttpClient =
        client {
            addInterceptor(authInterceptor)
            authenticator(authenticator)
        }

    @Provides
    @Singleton
    @AuthClient
    fun provideAuthOkHttp(): OkHttpClient = client()

    @Provides
    @Singleton
    fun provideApi(client: OkHttpClient, json: Json): FitTrainerApi =
        retrofit(client, json).create(FitTrainerApi::class.java)

    @Provides
    @Singleton
    fun provideRoutineApi(client: OkHttpClient, json: Json): RoutineApi =
        retrofit(client, json).create(RoutineApi::class.java)

    @Provides
    @Singleton
    fun provideExerciseApi(client: OkHttpClient, json: Json): ExerciseApi =
        retrofit(client, json).create(ExerciseApi::class.java)

    @Provides
    @Singleton
    fun provideSessionApi(client: OkHttpClient, json: Json): SessionApi =
        retrofit(client, json).create(SessionApi::class.java)

    @Provides
    @Singleton
    fun provideStudentsApi(client: OkHttpClient, json: Json): StudentsApi =
        retrofit(client, json).create(StudentsApi::class.java)

    @Provides
    @Singleton
    fun provideTrainerRoutinesApi(client: OkHttpClient, json: Json): TrainerRoutinesApi =
        retrofit(client, json).create(TrainerRoutinesApi::class.java)

    @Provides
    @Singleton
    fun provideTrainerExercisesApi(client: OkHttpClient, json: Json): TrainerExercisesApi =
        retrofit(client, json).create(TrainerExercisesApi::class.java)

    @Provides
    @Singleton
    fun provideTrainerTemplatesApi(client: OkHttpClient, json: Json): TrainerTemplatesApi =
        retrofit(client, json).create(TrainerTemplatesApi::class.java)

    @Provides
    @Singleton
    fun provideTrainerChallengesApi(client: OkHttpClient, json: Json): TrainerChallengesApi =
        retrofit(client, json).create(TrainerChallengesApi::class.java)

    // A diferencia de InvitationApi, crear invitaciones necesita la sesión del entrenador.
    @Provides
    @Singleton
    fun provideTrainerInvitationApi(client: OkHttpClient, json: Json): TrainerInvitationApi =
        retrofit(client, json).create(TrainerInvitationApi::class.java)

    // AuthApi tiene que quedar en @AuthClient: en el cliente principal el refresh reentraría al TokenAuthenticator y se trabaría en su Mutex.
    @Provides
    @Singleton
    fun provideAuthApi(@AuthClient client: OkHttpClient, json: Json): AuthApi =
        retrofit(client, json).create(AuthApi::class.java)

    // Pública: va por el cliente sin Bearer, como AuthApi.
    @Provides
    @Singleton
    fun provideInvitationApi(@AuthClient client: OkHttpClient, json: Json): InvitationApi =
        retrofit(client, json).create(InvitationApi::class.java)

    private fun client(configure: OkHttpClient.Builder.() -> Unit = {}): OkHttpClient = OkHttpClient.Builder()
        // Conexión corta: sin red falla rápido y el caché de Room se muestra enseguida.
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(BuildConfig.API_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(BuildConfig.API_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .apply(configure)
        .apply {
            // Último interceptor: ve el Bearer ya agregado, pero nunca lo imprime (ni el token de invitación).
            if (BuildConfig.DEBUG) addInterceptor(httpLogging())
        }
        .build()

    private fun retrofit(client: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
}
