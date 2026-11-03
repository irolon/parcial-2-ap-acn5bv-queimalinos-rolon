package com.fittrainer.data.invitation.invite

import java.util.Base64

private const val PNG_PREFIX = "data:image/png;base64,"

/** Bytes del PNG de un `data:image/png;base64,…`, o null si no es eso o el base64 está roto. */
fun decodeDataUrl(dataUrl: String?): ByteArray? {
    if (dataUrl == null || !dataUrl.startsWith(PNG_PREFIX)) return null
    return try {
        Base64.getDecoder().decode(dataUrl.substring(PNG_PREFIX.length).trim()).takeIf { it.isNotEmpty() }
    } catch (e: IllegalArgumentException) {
        null
    }
}
