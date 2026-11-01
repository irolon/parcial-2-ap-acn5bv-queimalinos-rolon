package com.fittrainer.testing.fakes.notifications

import com.fittrainer.data.api.notifications.NotificationDto
import com.fittrainer.data.api.notifications.NotificationMetaDto
import com.fittrainer.data.api.notifications.NotificationPageDto
import com.fittrainer.data.api.notifications.NotificationsApi
import com.fittrainer.data.api.notifications.PushTokenDto
import com.fittrainer.data.auth.RequiredUser
import kotlinx.coroutines.CompletableDeferred

class FakeNotificationsApi : NotificationsApi {
    /** Respuesta por cursor `before` (null = página 1). */
    var pages: Map<String?, NotificationPageDto> = emptyMap()
    val listCalls = mutableListOf<String?>()
    val markReadCalls = mutableListOf<String>()

    /** Dueño (RequiredUser) con el que salió cada escritura. */
    val owners = mutableListOf<String>()
    var failMarks: Exception? = null
    var failList: Exception? = null
    var listGate: CompletableDeferred<Unit>? = null
    var markGate: CompletableDeferred<Unit>? = null

    fun page(vararg items: NotificationDto, next: String? = null) = NotificationPageDto(items.toList(), NotificationMetaDto(items.size, next))

    /** Respuesta de `unread_only=true` (todas las no leídas). */
    var unreadPage: NotificationPageDto = page()
    var unreadCalls = 0

    /** Compuertas por pedido de página (no las de no leídas), en orden: para respuestas que llegan desordenadas. */
    val listGates = ArrayDeque<CompletableDeferred<Unit>>()

    override suspend fun list(limit: Int, before: String?, unreadOnly: Boolean?): NotificationPageDto {
        if (unreadOnly == true) {
            unreadCalls++
            failList?.let { throw it }
            return unreadPage
        }
        listCalls += before
        failList?.let { throw it }
        // La respuesta se decide al salir el pedido, no al llegar: un pedido viejo trae datos viejos.
        val response = pages.getValue(before)
        listGates.removeFirstOrNull()?.await()
        listGate?.await()
        return response
    }

    override suspend fun markRead(owner: RequiredUser, id: String) {
        owners += owner.userId
        markGate?.await()
        failMarks?.let { throw it }
        markReadCalls += id
    }

    val registered = mutableListOf<PushTokenDto>()
    val removed = mutableListOf<String>()
    var failTokens: Exception? = null

    /** Se ejecuta al borrar un token: los tests miran el estado del dispositivo en ese momento. */
    var onRemove: suspend () -> Unit = {}

    override suspend fun registerToken(owner: RequiredUser, body: PushTokenDto) {
        owners += owner.userId
        failTokens?.let { throw it }
        registered += body
    }

    override suspend fun removeToken(owner: RequiredUser, token: String) {
        owners += owner.userId
        onRemove()
        failTokens?.let { throw it }
        removed += token
    }
}
