package com.fittrainer.data.chat

import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import java.io.InterruptedIOException
import java.net.SocketTimeoutException
import okhttp3.Headers.Companion.headersOf
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

/** Tarjeta 14: cada falla de POST /chat se traduce a un AiChatError. */
class AiChatErrorsTest {
    private fun body(code: String, message: String = "m") = """{"error":{"code":"$code","message":"$message"}}"""

    @Test fun `red y timeout`() {
        assertEquals(AiChatError.Offline, IOException().toAiChatError())
        assertEquals(AiChatError.Timeout, SocketTimeoutException().toAiChatError())
        assertEquals(AiChatError.Timeout, InterruptedIOException("timeout").toAiChatError())
    }

    @Test fun `los 429 se distinguen por codigo`() {
        assertEquals(AiChatError.DailyLimit, httpError(429, body("CHAT_LIMIT_REACHED")).toAiChatError())
        assertEquals(AiChatError.InProgress, httpError(429, body("CHAT_IN_PROGRESS")).toAiChatError())
        val raw = okhttp3.Response.Builder()
            .code(429).message("x").protocol(Protocol.HTTP_1_1)
            .request(Request.Builder().url("http://x/").build())
            .headers(headersOf("Retry-After", "120"))
            .build()
        val limited = HttpException(Response.error<Any>(body("RATE_LIMIT_EXCEEDED").toResponseBody(null), raw))
        assertEquals(AiChatError.TooManyAttempts(120), limited.toAiChatError())
    }

    @Test fun `502 y 503 traen el mensaje del backend`() {
        assertEquals(AiChatError.Unavailable("Caído"), httpError(503, body("AI_UNAVAILABLE", "Caído")).toAiChatError())
        assertEquals(AiChatError.Unavailable("Raro"), httpError(502, body("AI_INVALID_RESPONSE", "Raro")).toAiChatError())
        assertEquals(AiChatError.Unavailable(AI_UNAVAILABLE_FALLBACK_DATA), httpError(503, "no-json").toAiChatError())
    }

    @Test fun `lo demas es desconocido`() {
        assertEquals(AiChatError.Unknown, httpError(500).toAiChatError())
        assertEquals(AiChatError.Unknown, IllegalStateException().toAiChatError())
    }
}
