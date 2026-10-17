package com.fittrainer.data.routine

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.api.ExerciseDto
import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.api.RoutineApi
import com.fittrainer.data.api.RoutineExerciseDto
import com.fittrainer.data.api.StudentRoutineDto
import com.fittrainer.data.db.FitTrainerDatabase
import java.time.Clock
import java.util.Collections
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Con Room real (sus flujos se re-consultan por separado): el caché de un alumno nunca le llega a otro. */
@RunWith(AndroidJUnit4::class)
class RoutineRepositoryRoomTest {

    private lateinit var db: FitTrainerDatabase
    private var routineId = "rt-A"
    private val api = object : RoutineApi {
        override suspend fun mine() = MineResponse(listOf(routine(routineId)))
    }

    private fun routine(id: String) = StudentRoutineDto(
        routineId = id, name = "Rutina $id", days = listOf("monday"),
        exercises = listOf(RoutineExerciseDto(id = "re-$id", exercise = ExerciseDto(id = "ex-$id", name = "Press"))),
    )

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java,
        ).build()
    }

    @After fun tearDown() = db.close()

    @Test fun alCambiarDeDuenioNuncaEmiteLasRutinasDelAnterior() = runBlocking {
        val repo = RoutineRepository(api, db.routineDao(), Clock.systemUTC())
        repeat(20) { round ->
            routineId = "rt-A"
            repo.refresh("A")
            val seen = Collections.synchronizedList(mutableListOf<List<String>>())
            val job = launch(Dispatchers.Default) {
                repo.observeCache("B").collect { cache -> seen += cache.routines.map { it.id } }
            }
            delay(50)
            routineId = "rt-B"
            repo.refresh("B")
            withTimeout(5_000) { while (seen.lastOrNull() != listOf("rt-B")) delay(10) }
            job.cancel()
            assertTrue("vuelta $round, emisiones: $seen", seen.none { "rt-A" in it })
        }
    }
}
