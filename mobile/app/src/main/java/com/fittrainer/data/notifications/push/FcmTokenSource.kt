package com.fittrainer.data.notifications.push

import com.google.firebase.messaging.FirebaseMessaging
import javax.inject.Inject
import kotlinx.coroutines.tasks.await

/** De dónde sale el token de FCM del dispositivo. Interfaz para que los tests no toquen Firebase. */
interface FcmTokenSource {
    suspend fun token(): String
}

class FirebaseFcmTokenSource @Inject constructor() : FcmTokenSource {
    override suspend fun token(): String = FirebaseMessaging.getInstance().token.await()
}
