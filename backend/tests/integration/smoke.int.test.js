import { supabase } from '../../src/config/supabase.js';
import { api } from '../helpers/integration/api.js';
import { createTrainer, inviteAndJoin } from '../helpers/integration/actors.js';
import { cleanupRun } from '../helpers/integration/teardown.js';

// Smoke de la infraestructura: alta por la API, acceso con token y borrado de la corrida.
describe('integración — smoke', () => {
  let trainer;
  let student;

  it('un PT recién registrado lista sus alumnos (vacío)', async () => {
    trainer = await createTrainer('smoke');

    const res = await api(trainer.token).get('/students');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('el alumno invitado ve su propio perfil', async () => {
    student = await inviteAndJoin(trainer, 'smoke');

    const res = await api(student.token).get(`/students/${student.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(student.email);
  });

  it('cleanupRun borra el PT de la corrida (y es idempotente)', async () => {
    await cleanupRun();

    const { data, error } = await supabase.from('trainers').select('id').eq('id', trainer.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const students = await supabase.from('students').select('id').eq('id', student.id);
    expect(students.data).toEqual([]);
    await expect(cleanupRun()).resolves.toBeUndefined();
  });
});
