package com.fittrainer.testing.fakes.auth.logout

import androidx.datastore.core.DataStore
import com.fittrainer.data.auth.logout.PendingLogoutFile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** DataStore en memoria de los logouts pendientes, sin Tink. [onUpdate] corre adentro de cada escritura. */
class MemoryPendingLogoutDataStore(initial: PendingLogoutFile = PendingLogoutFile()) : DataStore<PendingLogoutFile> {
    val value = MutableStateFlow(initial)
    var onUpdate: (() -> Unit)? = null
    private val mutex = Mutex()

    override val data = value

    override suspend fun updateData(transform: suspend (t: PendingLogoutFile) -> PendingLogoutFile): PendingLogoutFile =
        mutex.withLock {
            onUpdate?.invoke()
            transform(value.value).also { value.value = it }
        }
}
