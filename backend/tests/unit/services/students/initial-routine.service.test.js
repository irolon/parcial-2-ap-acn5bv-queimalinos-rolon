import { jest } from '@jest/globals';

const mockInstantiate = jest.fn();
const mockNotify = jest.fn();
jest.unstable_mockModule('../../../../src/services/routine-templates/routine-templates.service.js', () => ({
  instantiate: mockInstantiate,
}));
jest.unstable_mockModule('../../../../src/services/notifications/notify.service.js', () => ({
  notify: mockNotify,
}));

const { assignInitialRoutine } = await import('../../../../src/services/students/initial-routine.service.js');

const STUDENT = { id: 'st-1', name: 'Pedro Gómez' };
const INVITATION = {
  id: 'inv-1',
  template_id: 'tp-1',
  routine_days: ['monday', 'friday'],
  trainer: { id: 'trainer-1' },
};
const FAILED_NOTICE = {
  userId: 'trainer-1',
  userRole: 'trainer',
  type: 'initial_routine_failed',
  title: 'No pudimos asignarle la rutina inicial a Pedro Gómez',
  body: 'Asignale una rutina desde su ficha.',
  data: { student_id: 'st-1' },
  push: true,
};

describe('initial-routine.service — assignInitialRoutine', () => {
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockNotify.mockResolvedValue({ id: 'n-1' });
  });
  afterEach(() => warn.mockRestore());

  it('sin plantilla no instancia ni avisa', async () => {
    const invitation = { ...INVITATION, template_id: null, routine_days: null };
    expect(await assignInitialRoutine(invitation, STUDENT)).toBeNull();
    expect(mockInstantiate).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('con plantilla la instancia para el alumno con el trainer y los días de la invitación', async () => {
    mockInstantiate.mockResolvedValue({ id: 'rt-1' });
    expect(await assignInitialRoutine(INVITATION, STUDENT)).toEqual({ id: 'rt-1' });
    expect(mockInstantiate).toHaveBeenCalledWith('trainer-1', 'tp-1', {
      student_id: 'st-1',
      days: ['monday', 'friday'],
    });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('sin días guardados usa los de la plantilla (days undefined)', async () => {
    mockInstantiate.mockResolvedValue({ id: 'rt-1' });
    await assignInitialRoutine({ ...INVITATION, routine_days: null }, STUDENT);
    expect(mockInstantiate.mock.calls[0][2]).toEqual({ student_id: 'st-1', days: undefined });
  });

  it('si instantiate falla devuelve null, deja un warn y avisa al PT', async () => {
    mockInstantiate.mockRejectedValue(Object.assign(new Error('x'), { code: 'TEMPLATE_EXERCISES_UNAVAILABLE' }));
    expect(await assignInitialRoutine(INVITATION, STUDENT)).toBeNull();
    expect(warn).toHaveBeenCalledWith('[invitations] rutina inicial no creada', expect.any(Object));
    expect(mockNotify).toHaveBeenCalledWith(FAILED_NOTICE);
  });

  it('plantilla borrada después de invitar (template_id null con días): avisa al PT sin instanciar', async () => {
    expect(await assignInitialRoutine({ ...INVITATION, template_id: null }, STUDENT)).toBeNull();
    expect(mockInstantiate).not.toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith(FAILED_NOTICE);
  });

  it('si el aviso también falla, igual devuelve null sin lanzar', async () => {
    mockInstantiate.mockRejectedValue(new Error('la base se cayó'));
    mockNotify.mockRejectedValue(new Error('notifications caída'));
    await expect(assignInitialRoutine(INVITATION, STUDENT)).resolves.toBeNull();
  });
});
