package com.fittrainer.di.auth

import android.content.Context
import androidx.datastore.core.DataStoreFactory
import androidx.datastore.dataStoreFile
import com.fittrainer.data.auth.AuthCrypto
import com.fittrainer.data.auth.logout.EncryptedPendingLogoutSerializer
import com.fittrainer.data.auth.logout.LogoutRetryQueue
import com.fittrainer.data.auth.logout.LogoutRetryScheduler
import com.fittrainer.data.auth.logout.PendingLogoutQueue
import com.fittrainer.data.auth.logout.PendingLogoutStore
import com.fittrainer.data.auth.logout.WorkManagerLogoutRetryScheduler
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/** Logouts que no llegaron al backend: archivo cifrado propio (mismo keyset que la sesión) y su reintento. */
@Module
@InstallIn(SingletonComponent::class)
abstract class LogoutRetryModule {

    @Binds
    abstract fun bindLogoutRetryQueue(impl: PendingLogoutQueue): LogoutRetryQueue

    @Binds
    abstract fun bindLogoutRetryScheduler(impl: WorkManagerLogoutRetryScheduler): LogoutRetryScheduler

    companion object {
        @Provides
        @Singleton
        fun providePendingLogoutStore(@ApplicationContext context: Context): PendingLogoutStore =
            PendingLogoutStore(
                DataStoreFactory.create(
                    serializer = EncryptedPendingLogoutSerializer { AuthCrypto.aead(context) },
                    produceFile = { context.dataStoreFile("pending-logouts.pb") },
                ),
            )
    }
}
