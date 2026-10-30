import { countFullWeeks } from '../../../../../src/models/gamification/streak.js';

const MWF = ['monday', 'wednesday', 'friday'];
const weeks = (trainedDates, assignedDays, today) =>
  countFullWeeks({ trainedDates, assignedDays, today });

describe('countFullWeeks', () => {
  it('sin días asignados (sin rutina) da 0', () => {
    expect(weeks(['2026-10-26'], [], '2026-11-02')).toBe(0);
  });

  it('sin sesiones da 0', () => {
    expect(weeks([], MWF, '2026-11-02')).toBe(0);
  });

  it('una semana pasada con todos los días asignados cuenta', () => {
    expect(weeks(['2026-10-19', '2026-10-21', '2026-10-23'], MWF, '2026-10-30')).toBe(1);
  });

  it('una semana pasada con un día faltante no cuenta', () => {
    expect(weeks(['2026-10-19', '2026-10-23'], MWF, '2026-10-30')).toBe(0);
  });

  it('los días no asignados entrenados no son necesarios ni molestan', () => {
    const trained = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-23'];
    expect(weeks(trained, MWF, '2026-10-30')).toBe(1);
  });

  it('la semana actual cuenta si ya se cumplieron todos sus días asignados', () => {
    // hoy domingo 1/11: lunes a domingo, todo cumplido
    expect(weeks(['2026-10-26', '2026-10-28', '2026-10-30'], MWF, '2026-11-01')).toBe(1);
  });

  it('la semana actual no cuenta si falta un día futuro', () => {
    // hoy miércoles 28: el viernes 30 todavía no pasó
    expect(weeks(['2026-10-26', '2026-10-28'], MWF, '2026-10-28')).toBe(0);
  });

  it('cuenta varias semanas, incluso con una intermedia incompleta', () => {
    const trained = [
      '2026-10-12',
      '2026-10-14',
      '2026-10-16', // completa
      '2026-10-19', // incompleta
      '2026-10-26',
      '2026-10-28',
      '2026-10-30', // completa
    ];
    expect(weeks(trained, MWF, '2026-11-01')).toBe(2);
  });

  it('las semanas anteriores a la primera sesión no cuentan', () => {
    expect(weeks(['2026-10-30'], ['friday'], '2026-11-02')).toBe(1);
  });

  it('una semana arranca el lunes y termina el domingo', () => {
    // el domingo 25/10 pertenece a la semana anterior a la del lunes 26
    expect(weeks(['2026-10-25', '2026-10-26'], ['sunday', 'monday'], '2026-11-02')).toBe(0);
    expect(weeks(['2026-10-26', '2026-11-01'], ['sunday', 'monday'], '2026-11-02')).toBe(1);
  });
});
