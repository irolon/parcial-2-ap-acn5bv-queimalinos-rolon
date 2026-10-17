package com.fittrainer.testing.fakes.auth

import com.fittrainer.data.auth.SessionTombstones

/** Marcas de sesión cerrada en memoria; compartirlas entre dos stores simula un reinicio del proceso. */
class FakeSessionTombstones : SessionTombstones {
    private var ids = emptySet<String>()
    var failWrites = false
    /** Si no es null, close() lanza esta excepción (en vez de devolver false). */
    var closeError: Throwable? = null
    /** Si es true, solo reset() falla (devuelve false); close() sigue funcionando. */
    var failReset = false
    /** Si no es null, reset() lanza esta excepción. */
    var resetError: Throwable? = null
    override fun closed(): Set<String> = ids
    override fun close(id: String): Boolean {
        closeError?.let { throw it }
        if (failWrites) return false
        ids = ids + id
        return true
    }
    override fun reset(): Boolean {
        resetError?.let { throw it }
        if (failWrites || failReset) return false
        ids = emptySet()
        return true
    }
}
