package com.fittrainer.di

import com.fittrainer.data.notifications.AndroidNotificationPermission
import com.fittrainer.data.notifications.LaunchSources
import com.fittrainer.data.notifications.NotificationPermission
import com.fittrainer.data.notifications.RepositoryLaunchSources
import com.fittrainer.data.notifications.push.FcmTokenSource
import com.fittrainer.data.notifications.push.FirebaseFcmTokenSource
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/** Push y centro de avisos (tarjeta 17). La limpieza al cerrar sesión se registra en CacheCleanersModule. */
@Module
@InstallIn(SingletonComponent::class)
abstract class NotificationsModule {
    @Binds
    abstract fun bindFcmTokenSource(impl: FirebaseFcmTokenSource): FcmTokenSource

    @Binds
    abstract fun bindNotificationPermission(impl: AndroidNotificationPermission): NotificationPermission

    @Binds
    abstract fun bindLaunchSources(impl: RepositoryLaunchSources): LaunchSources
}
