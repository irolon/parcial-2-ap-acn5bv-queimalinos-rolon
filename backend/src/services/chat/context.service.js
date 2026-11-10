import { Errors } from '../../shared/utils/errors.js';
import { normalizeEquipment } from '../../models/exercises/equipment.model.js';
import * as sessionsRepository from '../../repositories/sessions/sessions.repository.js';
import * as exercisesRepository from '../../repositories/exercises/exercises.repository.js';
import * as contextRepository from '../../repositories/chat/chat-context.repository.js';

const BODYWEIGHT = 'bodyweight';

/**
 * Sesión con la que se guarda el mensaje. Offline-first: la sesión llega al servidor recién
 * al terminar, así que si no existe se acepta y el mensaje queda sin sesión (null). Si
 * existe tiene que ser del alumno (si no, 404 como inexistente) y no estar terminada (400).
 */
export async function resolveSessionId(studentId, sessionId) {
  if (!sessionId) return null;
  const session = await sessionsRepository.findSessionById(sessionId);
  if (!session) return null;
  if (session.student_id !== studentId) throw Errors.sessionNotFound();
  if (session.finished_at) throw Errors.sessionFinished();
  return session.id;
}

/** El ejercicio actual si es accesible para el alumno (global o de su PT); si no, null: el chat no se corta. */
export async function findCurrentExercise(student, exerciseId) {
  if (!exerciseId) return null;
  const exercise = await exercisesRepository.findExerciseById(exerciseId);
  if (!exercise) return null;
  const accessible = exercise.is_global || (student.trainer_id && exercise.trainer_id === student.trainer_id);
  return accessible ? exercise : null;
}

/** Equipamiento de la ficha (lo carga el PT, admite texto libre) normalizado a códigos del catálogo. */
const gymEquipmentOf = (student) => normalizeEquipment(student.gym_equipment).codes;

/**
 * Contexto para n8n, sin datos personales (RNF-26: ni nombre, email, nacimiento, avatar ni
 * ids del alumno). `alternatives`: hasta 30 ejercicios accesibles del grupo del ejercicio
 * actual (de todos si no hay), con equipamiento del gimnasio del alumno o bodyweight.
 */
export async function buildChatContext(student, exercise) {
  const gymEquipment = gymEquipmentOf(student);
  const alternatives = await contextRepository.findAlternatives(student.trainer_id ?? null, {
    equipment: [...new Set([...gymEquipment, BODYWEIGHT])],
    muscleGroup: exercise?.muscle_group ?? null,
    excludeId: exercise?.id ?? null,
  });
  return {
    exercise: exercise
      ? { name: exercise.name, muscle_group: exercise.muscle_group, equipment: exercise.equipment }
      : null,
    student: {
      goal: student.goal ?? null,
      level: student.level ?? null,
      gym_equipment: gymEquipment,
      injuries: student.injuries?.trim() || null,
    },
    alternatives,
  };
}
