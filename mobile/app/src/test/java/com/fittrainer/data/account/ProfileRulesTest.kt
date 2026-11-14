package com.fittrainer.data.account

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Las mismas reglas que el backend (GX1 #94 y GX2 #95), para avisar antes de enviar. */
class ProfileRulesTest {

    @Test fun nombreEntre2y100RecortadoAntes() {
        assertNull(nameError("Ana"))
        assertNull(nameError("  Jo  "))
        assertEquals(NAME_ERROR, nameError(" J "))
        assertEquals(NAME_ERROR, nameError(""))
        assertEquals(NAME_ERROR, nameError("a".repeat(101)))
    }

    @Test fun telefonoVacioBorraYSiNoSeisDigitosEntreLosCaracteresPermitidos() {
        assertNull(phoneError(""))
        assertNull(phoneError("   "))
        assertNull(phoneError("+54 9 11 5555-5555"))
        assertNull(phoneError("(011) 4555 6666"))
        assertEquals(PHONE_ERROR, phoneError("12345")) // menos de 6 dígitos
        assertEquals(PHONE_ERROR, phoneError("11-55a5555")) // letra
        assertEquals(PHONE_ERROR, phoneError("1".repeat(31))) // más de 30
        assertEquals(PHONE_ERROR, phoneError("+-() 12345")) // 5 dígitos aunque sean 10 caracteres
    }

    @Test fun tituloVacioBorraYSiNoEntre2y80() {
        assertNull(titleError(""))
        assertNull(titleError("Lic. en Educación Física"))
        assertEquals(TITLE_ERROR, titleError("L"))
        assertEquals(TITLE_ERROR, titleError("a".repeat(81)))
    }

    @Test fun claveNuevaOchoConMayusculaYNumeroYDistintaDeLaActual() {
        assertNull(newPasswordError("Vieja1234", "Nueva1234"))
        assertEquals(PASSWORD_RULES_ERROR, newPasswordError("Vieja1234", "Corta1"))
        assertEquals(PASSWORD_RULES_ERROR, newPasswordError("Vieja1234", "sinmayuscula1"))
        assertEquals(PASSWORD_RULES_ERROR, newPasswordError("Vieja1234", "SinNumeroAca"))
        assertEquals(PASSWORD_RULES_ERROR, newPasswordError("Vieja1234", "Ñandu1234")) // como el backend: solo [A-Z]
        assertEquals(PASSWORD_SAME_ERROR, newPasswordError("Igual1234", "Igual1234"))
    }

    @Test fun repetirTieneQueCoincidir() {
        assertNull(repeatError("Nueva1234", "Nueva1234"))
        assertEquals(REPEAT_ERROR, repeatError("Nueva1234", "Nueva123"))
    }

    @Test fun vacioViajaComoNull() {
        assertNull(blankToNull("  "))
        assertEquals("11 5555", blankToNull(" 11 5555 "))
    }
}
