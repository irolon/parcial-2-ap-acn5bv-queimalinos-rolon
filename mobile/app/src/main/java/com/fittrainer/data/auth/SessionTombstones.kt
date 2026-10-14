package com.fittrainer.data.auth

import android.content.Context
import android.content.SharedPreferences

/**
 * Marcas persistentes de sesiones cerradas cuyo borrado en el archivo cifrado falló. Van por un
 * camino de escritura independiente de DataStore para que el cierre sobreviva a un reinicio.
 *
 * Invariante: una marca solo oculta sesiones cerradas; nunca una sesión creada después de la marca.
 * Por eso una marca que no se pudo borrar ([reset] devuelve false) es inofensiva.
 */
interface SessionTombstones {
    /** Ids de sesión cerradas, o `*@<epochMillis>` = todas las creadas hasta ese momento (`*` legado). */
    fun closed(): Set<String>

    /** Marca [id] como cerrada. Devuelve si quedó guardado en disco. */
    fun close(id: String): Boolean

    /** Borra todas las marcas (ya no queda nada que ocultar). Devuelve si quedó guardado en disco. */
    fun reset(): Boolean
}

/** [SessionTombstones] sobre un SharedPreferences común: los ids de sesión no son secretos. */
class SharedPrefsSessionTombstones(
    context: Context,
    prefFile: String = PREF_FILE,
) : SessionTombstones {

    private val prefs: SharedPreferences = context.getSharedPreferences(prefFile, Context.MODE_PRIVATE)

    // @Synchronized: close() es leer-modificar-escribir; dos cierres a la vez no pueden pisarse.
    @Synchronized
    override fun closed(): Set<String> = prefs.getStringSet(KEY, null).orEmpty().toSet()

    // commit() y no apply(): el llamador necesita saber si la marca llegó al disco.
    @Synchronized
    override fun close(id: String): Boolean = prefs.edit().putStringSet(KEY, closed() + id).commit()

    @Synchronized
    override fun reset(): Boolean = prefs.edit().remove(KEY).commit()

    private companion object {
        const val PREF_FILE = "fittrainer_auth_closed"
        const val KEY = "closed_sessions"
    }
}
