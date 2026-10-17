package com.fittrainer.testing.fakes.auth

import androidx.datastore.core.DataStore
import com.fittrainer.data.auth.AuthFile
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * DataStore en memoria, sin Tink. [failWrites] simula disco lleno; [failBeforeRead] una escritura que
 * falla antes de leer el archivo; [readFailures] colecciones que fallan al leer; [afterWriteGate] frena
 * la próxima escritura exitosa ya guardada, antes de volver al llamador.
 */
class FakeDataStore(initial: AuthFile = AuthFile()) : DataStore<AuthFile> {
    val value = MutableStateFlow(initial)
    var failWrites = false
    var failBeforeRead = false
    var readFailures = 0
    var afterWriteGate: CompletableDeferred<Unit>? = null
    private val mutex = Mutex()

    override val data: Flow<AuthFile> = flow {
        if (readFailures > 0) {
            readFailures--
            throw IOException("disco ilegible")
        }
        emitAll(value)
    }

    override suspend fun updateData(transform: suspend (t: AuthFile) -> AuthFile): AuthFile {
        val next = mutex.withLock {
            if (failBeforeRead) throw IOException("disco ilegible")
            val next = transform(value.value)
            if (failWrites) throw IOException("disco lleno")
            value.value = next
            next
        }
        // Fuera del lock: el archivo ya cambió y otra escritura puede entrar mientras este llamador espera.
        afterWriteGate?.let { gate ->
            afterWriteGate = null
            gate.await()
        }
        return next
    }
}
