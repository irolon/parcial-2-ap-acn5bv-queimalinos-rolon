package com.fittrainer.testing.fakes.auth

import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

fun fixedClock(millis: Long = CREATED_AT): Clock = Clock.fixed(Instant.ofEpochMilli(millis), ZoneOffset.UTC)

/** Reloj que el test adelanta a mano. */
class MutableClock(var millis: Long) : Clock() {
    override fun millis(): Long = millis
    override fun instant(): Instant = Instant.ofEpochMilli(millis)
    override fun getZone(): ZoneId = ZoneOffset.UTC
    override fun withZone(zone: ZoneId): Clock = this
}
