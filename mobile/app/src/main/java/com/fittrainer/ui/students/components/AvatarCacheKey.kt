package com.fittrainer.ui.students.components

/**
 * Clave de caché de Coil para una foto de perfil. La URL firmada de Supabase trae un `?token=` nuevo
 * en cada firma; con la URL completa como clave, cada refresco volvería a descargar la imagen y
 * parpadearía. La ruta del objeto lleva un UUID por subida, así que una foto nueva sí cambia la clave.
 */
fun avatarCacheKey(url: String): String = url.substringBefore('?')
