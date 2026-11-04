package com.fittrainer.data.messages.photo

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.media.ExifInterface
import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Tarjeta 18: la foto se achica a 1600 px, se endereza según el EXIF y sale en JPEG. */
@RunWith(AndroidJUnit4::class)
class PhotoCompressorTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val compressor = PhotoCompressor(context)

    /** Una foto azul; con [marked], el cuarto de arriba a la izquierda en rojo (para ver giros y reflejos). */
    private fun photo(width: Int, height: Int, orientation: Int = ExifInterface.ORIENTATION_NORMAL, marked: Boolean = false): String {
        val file = File(context.cacheDir, "test-$width-$height-$orientation-$marked.jpg")
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).apply { eraseColor(0xFF2952D9.toInt()) }
        if (marked) Canvas(bitmap).drawRect(0f, 0f, width / 2f, height / 2f, Paint().apply { color = Color.RED })
        file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 95, it) }
        ExifInterface(file.absolutePath).apply {
            setAttribute(ExifInterface.TAG_ORIENTATION, orientation.toString())
            saveAttributes()
        }
        return Uri.fromFile(file).toString()
    }

    private fun size(jpeg: ByteArray) = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        .also { BitmapFactory.decodeByteArray(jpeg, 0, jpeg.size, it) }
        .let { it.outWidth to it.outHeight }

    @Test fun unaFotoGrandeQuedaEn1600EnJpeg() = runBlocking {
        val jpeg = compressor.jpeg(photo(4000, 3000))!!
        assertEquals(1600 to 1200, size(jpeg))
        assertTrue(jpeg[0] == 0xFF.toByte() && jpeg[1] == 0xD8.toByte())
        assertTrue(jpeg.size < 5 * 1024 * 1024)
    }

    @Test fun unaFotoAcostadaPorElExifSeEndereza() = runBlocking {
        val jpeg = compressor.jpeg(photo(2000, 1000, ExifInterface.ORIENTATION_ROTATE_90))!!
        // 2000x1000 se achica a 1600x800 y el giro de 90° la deja parada.
        assertEquals(800 to 1600, size(jpeg))
    }

    /** En qué cuarto quedó el rojo: (derecha, abajo). */
    private fun redQuarter(jpeg: ByteArray): Pair<Boolean, Boolean> {
        val bitmap = BitmapFactory.decodeByteArray(jpeg, 0, jpeg.size)
        val quarters = listOf(false to false, true to false, false to true, true to true)
        return quarters.single { (right, bottom) ->
            val pixel = bitmap.getPixel(bitmap.width * (if (right) 3 else 1) / 4, bitmap.height * (if (bottom) 3 else 1) / 4)
            Color.red(pixel) > 180 && Color.blue(pixel) < 120
        }
    }

    @Test fun losReflejosYGirosDelExifQuedanComoEnLaGaleria() = runBlocking {
        // Original 200x100 con el rojo arriba a la izquierda; cada orientación EXIF lo lleva a otro cuarto.
        val cases = mapOf(
            ExifInterface.ORIENTATION_NORMAL to (false to false),
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL to (true to false),
            ExifInterface.ORIENTATION_FLIP_VERTICAL to (false to true),
            ExifInterface.ORIENTATION_ROTATE_90 to (true to false),
            ExifInterface.ORIENTATION_TRANSPOSE to (false to false),
            ExifInterface.ORIENTATION_TRANSVERSE to (true to true),
            ExifInterface.ORIENTATION_ROTATE_270 to (false to true),
        )
        cases.forEach { (orientation, quarter) ->
            val jpeg = compressor.jpeg(photo(200, 100, orientation, marked = true))!!
            assertEquals("orientación $orientation", quarter, redQuarter(jpeg))
        }
    }

    @Test fun unaUriQueNoEsUnaFotoDaNull() = runBlocking {
        val file = File(context.cacheDir, "no-es-foto.txt").apply { writeText("hola") }
        assertNull(compressor.jpeg(Uri.fromFile(file).toString()))
    }
}
