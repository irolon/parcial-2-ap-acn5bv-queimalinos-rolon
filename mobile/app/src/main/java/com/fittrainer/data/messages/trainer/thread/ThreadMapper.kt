package com.fittrainer.data.messages.trainer.thread

import com.fittrainer.data.api.messages.HistoryResponse
import com.fittrainer.data.db.messages.trainer.TrainerMessageEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessageThreadEntity
import com.fittrainer.data.messages.trainer.ThreadCache
import com.fittrainer.data.messages.trainer.toDomain
import java.time.Instant

/** El hilo nuevo (primera carga o hueco): nombre y foto de la contraparte salen de la página. */
fun HistoryResponse.toThreadEntity(trainerId: String, studentId: String, fetchedAt: Long) = TrainerMessageThreadEntity(
    trainerId, studentId, counterpart.name, meta.nextBefore, fetchedAt, counterpart.avatarUrl,
)

/** El hilo ya guardado con el nombre y la foto de esta página (un backend viejo sin foto la deja en null). */
fun TrainerMessageThreadEntity.withCounterpartOf(page: HistoryResponse, fetchedAt: Long) =
    copy(counterpartName = page.counterpart.name, counterpartAvatarUrl = page.counterpart.avatarUrl, fetchedAt = fetchedAt)

fun TrainerMessageThreadEntity.toCache(rows: List<TrainerMessageEntity>) =
    ThreadCache(counterpartName, rows.map { it.toDomain() }, nextBefore != null, Instant.ofEpochMilli(fetchedAt), counterpartAvatarUrl)
