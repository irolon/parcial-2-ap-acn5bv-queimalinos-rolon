package com.fittrainer.ui.students.components

import org.junit.Assert.assertEquals
import org.junit.Test

class AvatarCacheKeyTest {
    @Test
    fun `una URL firmada se reduce a la ruta sin query`() {
        assertEquals(
            "https://x.supabase.co/storage/v1/object/sign/avatars/t/1.jpg",
            avatarCacheKey("https://x.supabase.co/storage/v1/object/sign/avatars/t/1.jpg?token=abc"),
        )
    }

    @Test
    fun `dos URLs que difieren solo en el token comparten clave`() {
        val a = avatarCacheKey("https://h/avatars/t/1.jpg?token=uno")
        val b = avatarCacheKey("https://h/avatars/t/1.jpg?token=dos")
        assertEquals(a, b)
    }

    @Test
    fun `una URL sin query queda igual`() {
        assertEquals("https://h/avatars/t/1.jpg", avatarCacheKey("https://h/avatars/t/1.jpg"))
    }
}
