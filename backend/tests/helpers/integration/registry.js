// Ids creados en la corrida (por archivo de test): los usa el teardown.
const trainers = new Set();
const students = new Set();

export const trackTrainer = (id) => trainers.add(id);
export const trackStudent = (id) => students.add(id);
export const trackedTrainerIds = () => [...trainers];
export const trackedStudentIds = () => [...students];
