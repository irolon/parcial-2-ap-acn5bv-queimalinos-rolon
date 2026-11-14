package com.fittrainer.data.messages.photo

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Lado más largo de la foto que se sube: con JPEG 85 queda muy por debajo de los 5 MB del backend. */
const val PHOTO_MAX_SIDE = 1600
private const val QUALITY = 85

/** La foto elegida (cámara o galería, como uri en texto) lista para subir en JPEG; null si no se pudo leer. */
fun interface PhotoReader {
    suspend fun jpeg(uri: String): ByteArray?
}

/** Ancho y alto finales: el lado más largo queda en [max] como mucho, sin agrandar. */
fun scaledSize(width: Int, height: Int, max: Int = PHOTO_MAX_SIDE): Pair<Int, Int> {
    val longest = maxOf(width, height)
    if (longest <= max) return width to height
    val factor = max.toDouble() / longest
    return maxOf(1, Math.round(width * factor).toInt()) to maxOf(1, Math.round(height * factor).toInt())
}

/** Potencia de 2 para decodificar sin cargar la foto entera; la escala fina la hace [scaledSize]. */
fun sampleSize(width: Int, height: Int, max: Int = PHOTO_MAX_SIDE): Int {
    var sample = 1
    while (maxOf(width, height) / (sample * 2) >= max) sample *= 2
    return sample
}

/** Cómo enderezar una foto: girar [degrees] (horario) y después, si [mirror], reflejarla de izquierda a derecha. */
data class ExifTransform(val degrees: Float, val mirror: Boolean)

/** Las ocho orientaciones EXIF, como las resuelve androidx ExifInterface (las de cámara suelen venir acostadas). */
fun exifTransform(orientation: Int): ExifTransform = when (orientation) {
    ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> ExifTransform(0f, mirror = true)
    ExifInterface.ORIENTATION_ROTATE_180 -> ExifTransform(180f, mirror = false)
    ExifInterface.ORIENTATION_FLIP_VERTICAL -> ExifTransform(180f, mirror = true)
    ExifInterface.ORIENTATION_TRANSPOSE -> ExifTransform(90f, mirror = true)
    ExifInterface.ORIENTATION_ROTATE_90 -> ExifTransform(90f, mirror = false)
    ExifInterface.ORIENTATION_TRANSVERSE -> ExifTransform(270f, mirror = true)
    ExifInterface.ORIENTATION_ROTATE_270 -> ExifTransform(270f, mirror = false)
    else -> ExifTransform(0f, mirror = false)
}

/** Achica a [PHOTO_MAX_SIDE], endereza según el EXIF y re-codifica en JPEG (tarjeta 18). */
@Singleton
class PhotoCompressor @Inject constructor(@ApplicationContext private val context: Context) : PhotoReader {

    override suspend fun jpeg(uri: String): ByteArray? = jpeg(uri, PHOTO_MAX_SIDE)

    /** Como [jpeg], con otro lado máximo: la foto de perfil va a 512 px (GX2). */
    suspend fun jpeg(uri: String, maxSide: Int): ByteArray? = withContext(Dispatchers.IO) {
        try {
            encode(Uri.parse(uri), maxSide)
        } catch (e: Exception) {
            Log.w("PhotoCompressor", "No se pudo leer la foto", e)
            null
        }
    }

    private fun encode(uri: Uri, max: Int): ByteArray? {
        val resolver = context.contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        // Con inJustDecodeBounds decodeStream siempre devuelve null: solo llena outWidth y outHeight.
        val stream = resolver.openInputStream(uri) ?: return null
        stream.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        val transform = resolver.openInputStream(uri)?.use {
            exifTransform(ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL))
        } ?: ExifTransform(0f, mirror = false)
        val options = BitmapFactory.Options().apply { inSampleSize = sampleSize(bounds.outWidth, bounds.outHeight, max) }
        val decoded = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) } ?: return null
        val (width, height) = scaledSize(decoded.width, decoded.height, max)
        val matrix = Matrix().apply {
            postScale(width.toFloat() / decoded.width, height.toFloat() / decoded.height)
            postRotate(transform.degrees)
            if (transform.mirror) postScale(-1f, 1f)
        }
        val ready = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
        return ByteArrayOutputStream().use { out ->
            ready.compress(Bitmap.CompressFormat.JPEG, QUALITY, out)
            if (ready !== decoded) ready.recycle()
            decoded.recycle()
            out.toByteArray()
        }
    }
}
