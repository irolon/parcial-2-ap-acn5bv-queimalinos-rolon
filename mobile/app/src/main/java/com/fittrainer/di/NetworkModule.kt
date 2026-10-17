package com.fittrainer.di

import com.fittrainer.BuildConfig
import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.FitTrainerApi
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
import okhttp3.logging.HttpLoggingInterceptor
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

    // AuthApi tiene que quedar en @AuthClient: en el cliente principal el refresh reentraría al TokenAuthenticator y se trabaría en su Mutex.
    @Provides
    @Singleton
    fun provideAuthApi(@AuthClient client: OkHttpClient, json: Json): AuthApi =
        retrofit(client, json).create(AuthApi::class.java)

    private fun client(configure: OkHttpClient.Builder.() -> Unit = {}): OkHttpClient = OkHttpClient.Builder()
        // Conexión corta: sin red falla rápido y el caché de Room se muestra enseguida.
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(BuildConfig.API_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(BuildConfig.API_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .apply(configure)
        .apply {
            // Último interceptor: ve el Bearer ya agregado, pero nunca lo imprime.
            if (BuildConfig.DEBUG) {
                addInterceptor(
                    HttpLoggingInterceptor()
                        .setLevel(HttpLoggingInterceptor.Level.BASIC)
                        .apply { redactHeader("Authorization") }
                )
            }
        }
        .build()

    private fun retrofit(client: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
}
