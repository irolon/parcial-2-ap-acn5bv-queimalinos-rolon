package com.fittrainer.data.session

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** Sesión provisoria: persiste solo el rol elegido en la pantalla de login de desarrollo. */
class DataStoreSessionRepository(
    private val dataStore: DataStore<Preferences>,
) : SessionRepository {

    private val roleKey = stringPreferencesKey("role")

    override val session: Flow<Session> = dataStore.data.map { prefs ->
        when (prefs[roleKey]) {
            Role.STUDENT.name -> Session.Student
            Role.TRAINER.name -> Session.Trainer
            else -> Session.LoggedOut
        }
    }

    override suspend fun signInAs(role: Role) {
        dataStore.edit { it[roleKey] = role.name }
    }

    override suspend fun signOut() {
        dataStore.edit { it.remove(roleKey) }
    }
}
