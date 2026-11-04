package com.fittrainer.di.messages

import com.fittrainer.data.messages.photo.PhotoCompressor
import com.fittrainer.data.messages.photo.PhotoReader
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/** Chat del alumno (tarjeta 18): la foto elegida se achica y re-codifica antes de subirla. */
@Module
@InstallIn(SingletonComponent::class)
abstract class StudentMessagesModule {

    @Binds
    abstract fun bindPhotoReader(impl: PhotoCompressor): PhotoReader
}
