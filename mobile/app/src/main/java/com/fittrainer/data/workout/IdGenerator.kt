package com.fittrainer.data.workout

import java.util.UUID
import javax.inject.Inject

/** Ids generados en el celular (offline-first): reintentar el sync no duplica. */
fun interface IdGenerator {
    fun newId(): String
}

class UuidGenerator @Inject constructor() : IdGenerator {
    override fun newId(): String = UUID.randomUUID().toString()
}
