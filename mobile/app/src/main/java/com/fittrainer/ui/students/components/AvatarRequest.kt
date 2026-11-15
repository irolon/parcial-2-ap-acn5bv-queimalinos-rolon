package com.fittrainer.ui.students.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import coil.request.ImageRequest

/** Pedido de Coil para una foto de perfil, con la clave de caché sin el token de la firma. */
@Composable
fun avatarRequest(url: String): ImageRequest {
    val context = LocalContext.current
    return remember(url) {
        val key = avatarCacheKey(url)
        ImageRequest.Builder(context).data(url).memoryCacheKey(key).diskCacheKey(key).placeholderMemoryCacheKey(key).build()
    }
}
