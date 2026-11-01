package com.fittrainer.di.notifications

import com.fittrainer.data.notifications.AndroidNotificationPermission
import com.fittrainer.data.notifications.LaunchSources
import com.fittrainer.data.notifications.NotificationPermission
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.notifications.RepositoryLaunchSources
import com.fittrainer.data.notifications.push.FcmTokenSource
import com.fittrainer.data.notifications.push.FirebaseFcmTokenSource
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** Las notificaciones guardadas se borran al cerrar sesión, como el historial. */
@Module
@InstallIn(SingletonComponent::class)
abstract class NotificationsModule {
    @Binds
    @IntoSet
    abstract fun bindNotificationsCleaner(impl: NotificationsRepository): UserDataCleaner

    @Binds
    abstract fun bindFcmTokenSource(impl: FirebaseFcmTokenSource): FcmTokenSource

    @Binds
    abstract fun bindNotificationPermission(impl: AndroidNotificationPermission): NotificationPermission

    @Binds
    abstract fun bindLaunchSources(impl: RepositoryLaunchSources): LaunchSources
}
