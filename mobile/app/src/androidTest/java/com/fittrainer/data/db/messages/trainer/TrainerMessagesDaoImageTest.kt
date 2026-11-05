package com.fittrainer.data.db.messages.trainer

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** #73: la consulta de fotos por renovar cuenta la foto con texto que llegó sin firmar (SQL real, no el fake). */
@RunWith(AndroidJUnit4::class)
class TrainerMessagesDaoImageTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: TrainerMessagesDao

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
        dao = db.trainerMessagesDao()
    }

    @After fun tearDown() = db.close()

    private fun row(id: String, createdAt: Long, body: String?, imageUrl: String?, hasImage: Boolean, fetchedAt: Long = 0) =
        TrainerMessageEntity("t1", id, "s1", "student", body, imageUrl, null, null, createdAt, fetchedAt, hasImage)

    @Test fun laFotoConTextoSinFirmarCuentaComoPorRenovar() = runTest {
        dao.upsertMessages(listOf(row("m1", 1, "hola", null, hasImage = false), row("m2", 2, "mirá", null, hasImage = true)))
        assertEquals(2L, dao.newestStaleImageAt("t1", "s1", signedBefore = 10))
    }

    @Test fun unMensajeDeSoloTextoNoCuenta() = runTest {
        dao.upsertMessages(listOf(row("m1", 1, "hola", null, hasImage = false)))
        assertNull(dao.newestStaleImageAt("t1", "s1", signedBefore = 10))
    }
}
