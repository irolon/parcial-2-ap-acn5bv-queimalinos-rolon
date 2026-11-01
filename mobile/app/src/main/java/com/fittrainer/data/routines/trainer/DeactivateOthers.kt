package com.fittrainer.data.routines.trainer

/**
 * "Desactivar la rutina actual" (E8 y E9): después de crear o asignar [keepId], desactiva cada una de las
 * que estaban activas. Una falla no frena a las demás. Devuelve los nombres de las que no se pudieron
 * desactivar, para el aviso.
 */
suspend fun TrainerRoutinesRepository.deactivateOthers(
    trainerId: String,
    previous: List<TrainerRoutineSummary>,
    keepId: String,
): List<String> = previous
    .filter { it.id != keepId && it.active }
    .filter { update(trainerId, it.id, routineActivePatch(false)).isFailure }
    .map { it.name }
