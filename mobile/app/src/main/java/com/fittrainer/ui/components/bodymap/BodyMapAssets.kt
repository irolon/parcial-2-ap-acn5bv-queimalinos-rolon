package com.fittrainer.ui.components.bodymap

import android.content.Context
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.produceState
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private const val TAG = "BodyMap"

/** Caché del dibujo ya parseado: se arma una sola vez por proceso, con éxito o con fallo. */
private object BodyMapCache {
    @Volatile private var loaded = false
    @Volatile private var body: ParsedBody? = null

    /** Lo que haya hoy, sin leer nada: null si todavía no se cargó o si falló. */
    fun peekOrNull(): ParsedBody? = body

    @Synchronized
    fun get(context: Context): ParsedBody? {
        if (!loaded) {
            body = try {
                val json = context.assets.open(BODY_MAP_ASSET).bufferedReader().use { it.readText() }
                val data = parseBodyMap(json) ?: error("el JSON del dibujo es inválido")
                parseBody(data)
            } catch (e: Exception) {
                Log.w(TAG, "No se pudo cargar el dibujo del cuerpo", e)
                null
            }
            loaded = true
        }
        return body
    }
}

/**
 * El dibujo del cuerpo; con la caché caliente llega en el primer frame. Null mientras carga o si
 * falló (no reintenta).
 */
@Composable
fun rememberBodyMap(): ParsedBody? {
    val appContext = LocalContext.current.applicationContext
    val state: State<ParsedBody?> = produceState<ParsedBody?>(initialValue = BodyMapCache.peekOrNull(), appContext) {
        if (value == null) value = withContext(Dispatchers.IO) { BodyMapCache.get(appContext) }
    }
    return state.value
}
