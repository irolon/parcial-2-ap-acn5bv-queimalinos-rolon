package com.fittrainer.data.auth.tokenstore.datastoretokenstore

import com.fittrainer.data.auth.tokenstore.DataStoreTokenStore
import com.fittrainer.testing.fakes.auth.FakeDataStore
import com.fittrainer.testing.fakes.auth.FakeSessionTombstones
import com.fittrainer.testing.fakes.auth.authState

/** Fixture de los tests JVM de [DataStoreTokenStore] (el de androidTest cubre el cifrado real). */
abstract class DataStoreTokenStoreTestBase {

    protected val sessionA = authState(session = "session-A")
    protected val sessionB = authState(access = "access-B", refresh = "refresh-B", session = "session-B")
    protected val dataStore = FakeDataStore()
    protected val tombstones = FakeSessionTombstones()
    protected val store = DataStoreTokenStore(dataStore, tombstones)

    /** Otro store sobre el mismo disco: simula un reinicio del proceso. */
    protected fun restarted() = DataStoreTokenStore(dataStore, tombstones)
}
