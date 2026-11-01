import * as repo from '../../repositories/agenda/availability.repository.js';
import { toSlot } from '../../models/agenda/availability.model.js';

/** Franjas del entrenador autenticado, ordenadas. */
export async function list(user) {
  return (await repo.findAvailability(user.id)).map(toSlot);
}

/** Reemplaza toda la disponibilidad (validada) y devuelve lo guardado. */
export async function replace(user, { slots }) {
  return (await repo.replaceAvailability(user.id, slots)).map(toSlot);
}
