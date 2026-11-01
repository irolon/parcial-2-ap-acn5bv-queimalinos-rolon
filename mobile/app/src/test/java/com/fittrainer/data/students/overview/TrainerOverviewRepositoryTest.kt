package com.fittrainer.data.students.overview

import com.fittrainer.testing.fakes.students.FakeOverviewApi
import com.fittrainer.testing.fakes.students.FakeTrainerOverviewDao
import com.fittrainer.testing.fakes.students.overviewDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerOverviewRepositoryTest {

    private val api = FakeOverviewApi()
    private val dao = FakeTrainerOverviewDao()
    private val repo = TrainerOverviewRepository(api, dao, Clock.fixed(Instant.ofEpochMilli(4_000), ZoneOffset.UTC))

    @Test fun `refresh guarda el resumen y lo convierte`() = runTest {
        assertTrue(repo.refresh("t1").isSuccess)
        val cache = repo.observe("t1").first()!!
        assertEquals(Instant.ofEpochMilli(4_000), cache.fetchedAt)
        val o = cache.overview
        assertEquals(7, o.activeStudents)
        assertEquals(58, o.adherencePct)
        // El aviso sin sesión se descarta en vez de romper la pantalla.
        assertEquals(2, o.attention.size)
        assertEquals(AttentionItem.AtRisk("s1", "Lucía Fernández", 10, false), o.attention[0])
        assertEquals(Instant.parse("2026-11-01T12:00:00Z"), o.recent.single().finishedAt)
        assertNull(o.recent.single().rpe)
    }

    @Test fun `adherencia null si nadie tiene plan`() = runTest {
        api.response = overviewDto(pct = null, delta = null)
        repo.refresh("t1")
        val o = repo.observe("t1").first()!!.overview
        assertNull(o.adherencePct)
        assertNull(o.adherenceDelta)
    }

    @Test fun `un error conserva el resumen anterior`() = runTest {
        repo.refresh("t1")
        api.response = overviewDto(active = 99)
        api.error = IOException("sin red")
        assertTrue(repo.refresh("t1").isFailure)
        assertEquals(7, repo.observe("t1").first()!!.overview.activeStudents)
    }

    @Test fun `otro entrenador no ve nada y clearUserData borra solo lo suyo`() = runTest {
        repo.refresh("t1")
        assertNull(repo.observe("t2").first())
        repo.clearUserData("t2")
        assertTrue(repo.observe("t1").first() != null)
        repo.clearUserData("t1")
        assertNull(repo.observe("t1").first())
    }
}
