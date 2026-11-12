package com.fittrainer.data.trainerai

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** E15: el equipamiento de la ficha (texto libre) llevado al catálogo, como el backend y la web. */
class AiEquipmentTest {

    @Test fun `codigos, sinonimos, plurales y acentos van al catalogo sin repetir`() {
        val gear = normalizeEquipment(listOf("Mancuernas", "barbell", " Máquinas ", "Pesas rusas", "Banda elástica", "mancuerna"))
        assertEquals(listOf("dumbbell", "barbell", "machine", "kettlebell", "band"), gear.codes)
        assertEquals(emptyList<String>(), gear.unmapped)
    }

    @Test fun `lo que no mapea queda como se cargo, sin repetir, y los vacios se ignoran`() {
        val gear = normalizeEquipment(listOf(" Banco ", "banco", "  ", "TRX", "Sin equipamiento"))
        assertEquals(listOf("bodyweight"), gear.codes)
        assertEquals(listOf("Banco", "TRX"), gear.unmapped)
    }

    @Test fun `sin ficha no hay nada`() {
        assertEquals(AiEquipment(emptyList(), emptyList()), normalizeEquipment(null))
    }

    @Test fun `la nota del extra es la del backend`() {
        assertEquals("Equipamiento extra del gimnasio: Banco, TRX", extraEquipmentNote(listOf("Banco", "TRX")))
        assertNull(extraEquipmentNote(emptyList()))
    }
}
