import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import AutosaveHeader from '@/components/routines/editor/AutosaveHeader';
import { usePageHeaderStore } from '@/hooks/shared/usePageHeader';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const header = () => usePageHeaderStore.getState().header;

describe('AutosaveHeader', () => {
  it('sin guardado muestra solo el camino y el título con el nombre', () => {
    render(<AutosaveHeader name="Fuerza A" savedAt={null} />);
    expect(header()).toEqual({ title: 'Nueva rutina — Fuerza A', subtitle: 'RUTINAS › CREAR' });
  });

  it('cuenta los segundos desde el guardado sin que lo vuelva a renderizar el padre', () => {
    render(<AutosaveHeader name="" savedAt={new Date()} />);
    expect(header()).toEqual({ title: 'Nueva rutina', subtitle: 'RUTINAS › CREAR · AUTO-GUARDADO · HACE 0S' });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(header().subtitle).toContain('HACE 3S');
  });

  it('no renderiza nada y al desmontar devuelve la topbar', () => {
    const { container, unmount } = render(<AutosaveHeader name="" savedAt={null} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    expect(header()).toBeNull();
  });
});
