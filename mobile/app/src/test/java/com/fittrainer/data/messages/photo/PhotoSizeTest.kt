package com.fittrainer.data.messages.photo

import android.media.ExifInterface
import com.fittrainer.data.account.AVATAR_MAX_SIDE
import org.junit.Assert.assertEquals
import org.junit.Test

/** Tarjeta 18: la cuenta del tamaño de la foto que se sube. */
class PhotoSizeTest {

    @Test fun elLadoMasLargoQuedaEn1600SinDeformar() {
        assertEquals(1600 to 1200, scaledSize(4000, 3000))
        assertEquals(900 to 1600, scaledSize(2700, 4800))
    }

    @Test fun laFotoDePerfilQuedaEn512() {
        assertEquals(512 to 384, scaledSize(4000, 3000, AVATAR_MAX_SIDE))
        assertEquals(288 to 512, scaledSize(2700, 4800, AVATAR_MAX_SIDE))
        assertEquals(4, sampleSize(4000, 3000, AVATAR_MAX_SIDE))
    }

    @Test fun unaFotoChicaNoSeAgranda() {
        assertEquals(800 to 600, scaledSize(800, 600))
        assertEquals(1600 to 1600, scaledSize(1600, 1600))
    }

    @Test fun elSampleSizeDecodificaPorEncimaDelTope() {
        assertEquals(2, sampleSize(4000, 3000))
        assertEquals(1, sampleSize(3000, 2000))
        assertEquals(4, sampleSize(8000, 6000))
        assertEquals(1, sampleSize(1000, 800))
    }

    @Test fun lasOchoOrientacionesExifDanGiroYReflejo() {
        val expected = mapOf(
            ExifInterface.ORIENTATION_NORMAL to ExifTransform(0f, false),
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL to ExifTransform(0f, true),
            ExifInterface.ORIENTATION_ROTATE_180 to ExifTransform(180f, false),
            ExifInterface.ORIENTATION_FLIP_VERTICAL to ExifTransform(180f, true),
            ExifInterface.ORIENTATION_TRANSPOSE to ExifTransform(90f, true),
            ExifInterface.ORIENTATION_ROTATE_90 to ExifTransform(90f, false),
            ExifInterface.ORIENTATION_TRANSVERSE to ExifTransform(270f, true),
            ExifInterface.ORIENTATION_ROTATE_270 to ExifTransform(270f, false),
        )
        expected.forEach { (orientation, transform) -> assertEquals("orientación $orientation", transform, exifTransform(orientation)) }
        assertEquals(ExifTransform(0f, false), exifTransform(ExifInterface.ORIENTATION_UNDEFINED))
    }
}
