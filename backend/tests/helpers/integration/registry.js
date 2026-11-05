// Trainers creados en la corrida (por archivo de test): los usa el teardown.
// Los alumnos no se registran: caen con su trainer (deleteQaData los busca por trainer_id).
const trainers = new Set();

export const trackTrainer = (id) => trainers.add(id);
export const trackedTrainerIds = () => [...trainers];
