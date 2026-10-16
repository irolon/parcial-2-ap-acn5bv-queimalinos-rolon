package com.fittrainer.data.invitation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class InvitationLinkTest {

    private val token = "3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f"

    @Test fun `url del backend`() {
        assertEquals(token, InvitationLink.parse("http://localhost:5173/join?token=$token"))
    }

    @Test fun `https con otros parametros y espacios alrededor`() {
        assertEquals(token, InvitationLink.parse("  https://fittrainer.app/join?utm=wa&token=$token&x=1 \n"))
    }

    @Test fun `uuid solo`() {
        assertEquals(token, InvitationLink.parse(token))
    }

    @Test fun `uuid en mayusculas se normaliza`() {
        assertEquals(token, InvitationLink.parse(token.uppercase()))
    }

    @Test fun `url sin token`() {
        assertNull(InvitationLink.parse("http://localhost:5173/join"))
    }

    @Test fun `token que no es uuid`() {
        assertNull(InvitationLink.parse("http://localhost:5173/join?token=abc123"))
    }

    @Test fun `texto vacio`() {
        assertNull(InvitationLink.parse("   "))
    }

    @Test fun `link de otra app`() {
        assertNull(InvitationLink.parse("https://wa.me/5491112345678?text=hola"))
    }
}
