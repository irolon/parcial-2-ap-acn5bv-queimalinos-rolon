package com.fittrainer.data.api.notifications

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** El listado arma la query que espera el backend (`unread_only` solo cuando se pide). */
class NotificationsApiQueryTest {
    private val json = Json { ignoreUnknownKeys = true }
    private val server = MockWebServer().apply { start() }
    private val api = Retrofit.Builder()
        .baseUrl(server.url("/api/"))
        .client(OkHttpClient())
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(NotificationsApi::class.java)

    @After fun tearDown() = server.shutdown()

    private fun enqueueEmpty() = server.enqueue(MockResponse().setBody("""{"data":[],"meta":{"unread_count":0,"next_before":null}}"""))

    @Test fun soloNoLeidasMandaUnreadOnlyTrue() = runTest {
        enqueueEmpty()
        api.list(100, unreadOnly = true)
        assertEquals("/api/notifications?limit=100&unread_only=true", server.takeRequest().path)
    }

    @Test fun paginaNormalNoMandaUnreadOnly() = runTest {
        enqueueEmpty()
        api.list(20, "2026-10-30T06:00:00+00:00")
        val url = server.takeRequest().requestUrl!!
        assertEquals("2026-10-30T06:00:00+00:00", url.queryParameter("before"))
        assertEquals(null, url.queryParameter("unread_only"))
    }
}
