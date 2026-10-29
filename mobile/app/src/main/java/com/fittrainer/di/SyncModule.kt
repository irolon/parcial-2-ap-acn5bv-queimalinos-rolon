package com.fittrainer.di

import com.fittrainer.data.session.UserDataCleaner
import com.fittrainer.data.sync.CancelSyncOnSignOut
import com.fittrainer.data.sync.SessionSync
import com.fittrainer.data.sync.SyncPass
import com.fittrainer.data.sync.UploadPass
import com.fittrainer.data.sync.WorkManagerSessionSync
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

@Module
@InstallIn(SingletonComponent::class)
abstract class SyncModule {

    @Binds
    abstract fun bindSessionSync(impl: WorkManagerSessionSync): SessionSync

    @Binds
    abstract fun bindUploadPass(impl: SyncPass): UploadPass

    @Binds
    @IntoSet
    abstract fun bindCancelSyncOnSignOut(impl: CancelSyncOnSignOut): UserDataCleaner
}
