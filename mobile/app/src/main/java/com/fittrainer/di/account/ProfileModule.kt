package com.fittrainer.di.account

import com.fittrainer.data.api.account.ProfileApi
import com.fittrainer.data.db.FitTrainerDatabase
import com.fittrainer.data.db.account.MyProfileDao
import com.fittrainer.data.messages.photo.PhotoCompressor
import com.fittrainer.data.account.AVATAR_MAX_SIDE
import com.fittrainer.data.account.AvatarReader
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.data.session.UserDataCleaner
import com.fittrainer.di.NetworkModule
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient

/** Perfil y Más (perfil propio y contraseña): API, Room, la foto achicada y el borrado al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class ProfileModule {

    @Binds
    @IntoSet
    abstract fun bindProfileCleaner(impl: ProfileRepository): UserDataCleaner

    companion object {
        @Provides
        @Singleton
        fun provideProfileApi(client: OkHttpClient, json: Json): ProfileApi =
            NetworkModule.retrofit(client, json).create(ProfileApi::class.java)

        @Provides
        fun provideMyProfileDao(db: FitTrainerDatabase): MyProfileDao = db.myProfileDao()

        /** La misma lectura de la foto del chat, a 512 px de lado mayor (GX2). */
        @Provides
        fun provideAvatarReader(compressor: PhotoCompressor): AvatarReader = AvatarReader { uri -> compressor.jpeg(uri, AVATAR_MAX_SIDE) }
    }
}
