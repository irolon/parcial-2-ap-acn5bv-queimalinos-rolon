package com.fittrainer.di

import android.content.Context
import androidx.datastore.core.DataStoreFactory
import androidx.datastore.dataStoreFile
import com.fittrainer.data.auth.AuthCrypto
import com.fittrainer.data.auth.DataStoreTokenStore
import com.fittrainer.data.auth.EncryptedAuthSerializer
import com.fittrainer.data.auth.SharedPrefsSessionTombstones
import com.fittrainer.data.auth.TokenStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.time.Clock
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AuthModule {

    @Provides
    @Singleton
    fun provideTokenStore(@ApplicationContext context: Context, clock: Clock): TokenStore =
        DataStoreTokenStore(
            DataStoreFactory.create(
                serializer = EncryptedAuthSerializer { AuthCrypto.aead(context) },
                produceFile = { context.dataStoreFile("auth.pb") },
            ),
            SharedPrefsSessionTombstones(context),
            clock = clock,
        )
}
