package com.fittrainer.testing.fakes.workout

import com.fittrainer.data.workout.OpenSessionNotifier
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/** Notifier para los tests que solo necesitan un WorkoutRepository: manda todo a un FakeSessionApi. */
fun testNotifier(api: FakeSessionApi = FakeSessionApi()) =
    OpenSessionNotifier(api, CoroutineScope(SupervisorJob() + Dispatchers.Unconfined))
