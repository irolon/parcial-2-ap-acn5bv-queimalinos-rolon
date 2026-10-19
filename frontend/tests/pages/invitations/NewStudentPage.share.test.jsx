import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import {
  PAGE_PATH,
  QR_PNG,
  fillAndSubmit,
  invitationResponse,
  page,
  stubCanvas,
} from '../../helpers/invitations/newStudent';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

const INVITATION = invitationResponse();

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  stubCanvas();
  stubFetch(async () => jsonResponse(201, { data: INVITATION }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function generate(user) {
  renderRoute(PAGE_PATH);
  await fillAndSubmit({}, user);
  await page().findByRole('img', { name: 'Código QR de la invitación de Tomás Rivera' });
}

describe('NewStudentPage: compartir', () => {
  it('después de generar muestra QR, nombre, vigencia, link y botones', async () => {
    await generate();
    expect(page().getByText('Tomás, abrí con la cámara')).toBeInTheDocument();
    expect(page().getByText('VÁLIDO 48H')).toBeInTheDocument();
    expect(page().getByTestId('join-url')).toHaveTextContent(INVITATION.join_url);
    for (const name of ['Copiar link', 'WhatsApp', 'Descargar', 'Generar otro']) {
      expect(page().getByRole('button', { name })).toBeEnabled();
    }
    expect(page().queryByText('Completá los datos y generá el QR')).not.toBeInTheDocument();
  });

  it('el QR lleva el logo de marca al centro', async () => {
    await generate();
    const qr = page().getByRole('img', { name: /Código QR/ });
    const logo = qr.parentElement.querySelector('img');
    expect(logo.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('Copiar link escribe el link en el portapapeles y muestra "¡Copiado!" por 2 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await generate(user);
    await user.click(page().getByRole('button', { name: 'Copiar link' }));
    expect(writeText).toHaveBeenCalledWith(INVITATION.join_url);
    expect(page().getByRole('button', { name: '¡Copiado!' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(page().getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
  });

  it('si no se puede copiar, avisa "No se pudo copiar, copialo a mano" por 2 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await generate(user);
    await user.click(page().getByRole('button', { name: 'Copiar link' }));
    expect(page().getByText('No se pudo copiar, copialo a mano')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(page().getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
  });

  it('WhatsApp abre whatsapp_share_url en una pestaña nueva sin opener', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const user = userEvent.setup();
    await generate(user);
    await user.click(page().getByRole('button', { name: 'WhatsApp' }));
    expect(open).toHaveBeenCalledWith(INVITATION.whatsapp_share_url, '_blank', 'noopener,noreferrer');
  });

  it('sin whatsapp_share_url el botón WhatsApp queda deshabilitado', async () => {
    stubFetch(async () =>
      jsonResponse(201, { data: invitationResponse({ whatsapp_share_url: undefined }) }),
    );
    await generate();
    expect(page().getByRole('button', { name: 'WhatsApp' })).toBeDisabled();
  });

  it('Descargar baja el PNG del canvas como invitacion-<nombre>.png', async () => {
    const clicks = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      clicks.push({ href: this.href, download: this.download });
    });
    const user = userEvent.setup();
    await generate(user);
    await user.click(page().getByRole('button', { name: 'Descargar' }));
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
    expect(clicks).toEqual([{ href: QR_PNG, download: 'invitacion-tomas-rivera.png' }]);
  });

  it('Descargar espera a que el logo esté listo antes de exportar el PNG', async () => {
    let release;
    HTMLImageElement.prototype.decode = () => new Promise((resolve) => { release = resolve; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    await generate(user);
    await user.click(page().getByRole('button', { name: 'Descargar' }));
    expect(HTMLCanvasElement.prototype.toDataURL).not.toHaveBeenCalled();
    await act(async () => release());
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
    delete HTMLImageElement.prototype.decode;
  });

  it('Generar otro limpia el formulario y vuelve al estado vacío', async () => {
    const user = userEvent.setup();
    await generate(user);
    await user.click(page().getByRole('button', { name: 'Generar otro' }));
    expect(page().getByText('Completá los datos y generá el QR')).toBeInTheDocument();
    expect(page().getByLabelText('Nombre y apellido')).toHaveValue('');
    expect(page().getByLabelText('Email')).toHaveValue('');
    expect(page().getByLabelText('Teléfono')).toHaveValue('+54 ');
    expect(page().getByLabelText('Nombre y apellido')).toHaveFocus();
  });
});
