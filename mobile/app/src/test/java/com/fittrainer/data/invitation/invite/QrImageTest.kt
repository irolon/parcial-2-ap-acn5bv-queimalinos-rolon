package com.fittrainer.data.invitation.invite

import java.util.Base64
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertNull
import org.junit.Test

class QrImageTest {

    @Test fun `data URL de PNG valida devuelve los bytes`() {
        val bytes = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47)
        val url = "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes)
        assertArrayEquals(bytes, decodeDataUrl(url))
    }

    @Test fun `basura, otro tipo o null devuelven null`() {
        assertNull(decodeDataUrl(null))
        assertNull(decodeDataUrl("data:image/png;base64,%%%no-es-base64"))
        assertNull(decodeDataUrl("data:image/jpeg;base64,AAAA"))
        assertNull(decodeDataUrl("data:image/png;base64,"))
    }
}
