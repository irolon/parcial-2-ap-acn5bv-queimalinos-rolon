import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { stub, stubDesktop } from '../../../helpers/messages/ptMessages';
import { calls, errorResponse } from '../../../helpers/shared/fetchMock';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('MessagesPage: lista', () => {
  it('muestra las filas en el orden del servidor con vista previa, "Vos:" y no leídos', async () => {
    stub();
    renderRoute('/pt/mensajes');
    const rows = await screen.findAllByRole('button', { name: /Ana Paz|Ángel Díaz|Bruno Sosa/ });
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Ana Paz'),
      expect.stringContaining('Ángel Díaz'),
      expect.stringContaining('Bruno Sosa'),
    ]);
    expect(within(rows[0]).getByText('Listo!')).toBeInTheDocument();
    expect(within(rows[0]).getByText('3 sin leer')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Vos: 📷 Foto')).toBeInTheDocument();
    expect(screen.getByText('Elegí un alumno para ver la conversación')).toBeInTheDocument();
  });

  it('busca por nombre sin acentos ni mayúsculas', async () => {
    const user = userEvent.setup();
    stub();
    renderRoute('/pt/mensajes');
    await screen.findByRole('button', { name: /Ana Paz/ });
    await user.type(screen.getByRole('searchbox', { name: 'Buscar alumno' }), 'ANGEL');
    expect(screen.queryByRole('button', { name: /Ana Paz/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Ángel Díaz/ })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No hay alumnos con ese nombre.')).toBeInTheDocument();
  });

  it('?alumno= abre esa conversación y elegir otra actualiza el param con replace', async () => {
    const user = userEvent.setup();
    const fetchMock = stub();
    const { router } = renderRoute('/pt/mensajes?alumno=s-1');
    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Paz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ana Paz/ })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: /Bruno Sosa/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Bruno Sosa' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?alumno=s-3');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(calls(fetchMock).some(([u]) => u === '/messages/s-3')).toBe(true);
  });

  it('un id fuera de la lista igual intenta abrirla y muestra el error del 403', async () => {
    stub({ '/messages/ajeno': () => errorResponse(403, 'FORBIDDEN', 'Sin acceso') });
    renderRoute('/pt/mensajes?alumno=ajeno');
    expect(await screen.findByText('No pudimos cargar la conversación.')).toBeInTheDocument();
  });
});

describe('MessagesPage: responsive', () => {
  it('en mobile sin alumno solo se ve la lista', async () => {
    stubDesktop(false);
    stub();
    renderRoute('/pt/mensajes');
    await screen.findByRole('button', { name: /Ana Paz/ });
    expect(screen.queryByRole('region', { name: 'Conversación' })).toBeNull();
    expect(screen.queryByText('Elegí un alumno para ver la conversación')).toBeNull();
  });

  it('en mobile con alumno se ve la conversación con "Volver", que limpia el param', async () => {
    const user = userEvent.setup();
    stubDesktop(false);
    stub();
    const { router } = renderRoute('/pt/mensajes?alumno=s-1');
    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Paz' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Conversaciones' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(router.state.location.search).toBe('');
    expect(await screen.findByRole('button', { name: /Bruno Sosa/ })).toBeInTheDocument();
  });

  it('en escritorio no hay "Volver"', async () => {
    stub();
    renderRoute('/pt/mensajes?alumno=s-1');
    await screen.findByRole('heading', { level: 2, name: 'Ana Paz' });
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  });
});

