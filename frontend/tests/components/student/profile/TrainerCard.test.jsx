import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import TrainerCard from '@/components/student/profile/TrainerCard';
import { SELF, TRAINER, renderOwn, signInSelf, stubSelf } from '../../../helpers/students/self';

beforeEach(signInSelf);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function show(counterpart) {
  stubSelf({ counterpart });
  return renderOwn(<TrainerCard studentId={SELF.id} />);
}

describe('TrainerCard: título y foto', () => {
  it('muestra el título profesional debajo del nombre', async () => {
    show({ ...TRAINER, professional_title: 'Lic. en Ed. Física' });
    const name = await screen.findByText(TRAINER.name);
    const title = screen.getByText('Lic. en Ed. Física');
    expect(title).toHaveClass('font-mono', 'uppercase');
    expect(name.nextElementSibling).toBe(title);
  });

  it('sin título solo muestra el nombre, sin un párrafo vacío', async () => {
    show({ ...TRAINER, professional_title: null });
    const name = await screen.findByText(TRAINER.name);
    expect(name.nextElementSibling).toBeNull();
  });

  it('con foto la muestra en el avatar', async () => {
    const { container } = show({ ...TRAINER, avatar_url: 'https://storage.test/t.jpg' });
    await screen.findByText(TRAINER.name);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://storage.test/t.jpg');
  });
});
