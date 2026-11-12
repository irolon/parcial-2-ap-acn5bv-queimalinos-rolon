import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InitialTemplateField from '@/components/invitations/InitialTemplateField';
import { setupUser } from '../../helpers/shared/user';
import { errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

const PUSH = { id: 't-1', name: 'Push A', level: 'intermediate', days: ['thursday', 'monday', 'tuesday', 'friday'] };
const LEGS = { id: 't-2', name: 'Piernas', level: null, days: ['wednesday'] };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderField({ templates = [PUSH, LEGS], errors } = {}) {
  stubFetch(async () => {
    if (templates === 'never') return new Promise(() => {});
    if (typeof templates === 'number') return errorResponse(templates, 'INTERNAL_ERROR', 'Falló');
    return jsonResponse(200, { data: templates });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(
    <QueryClientProvider client={client}>
      <form aria-label="invitar">
        <InitialTemplateField errors={errors} />
      </form>
    </QueryClientProvider>,
  );
  const formData = () => new FormData(container.querySelector('form'));
  return { formData };
}

const options = () => screen.getAllByRole('option').map((o) => o.textContent);

describe('InitialTemplateField', () => {
  it('lista "Sin plantilla" y las plantillas con días y nivel; sin elegir no manda nada', async () => {
    const { formData } = renderField();
    await vi.waitFor(() => expect(screen.getByLabelText('Plantilla inicial')).toBeEnabled());
    expect(screen.getByText('PLANTILLA INICIAL (OPCIONAL)')).toBeInTheDocument();
    expect(options()).toEqual(['Sin plantilla', 'Push A · 4 días · Intermedio', 'Piernas · 1 día']);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect([...formData().keys()]).toEqual([]);
  });

  it('al elegir una plantilla precarga sus días y los escribe en el formulario', async () => {
    const user = setupUser();
    const { formData } = renderField();
    await vi.waitFor(() => expect(screen.getByLabelText('Plantilla inicial')).toBeEnabled());
    await user.selectOptions(screen.getByLabelText('Plantilla inicial'), 't-1');
    expect(screen.getByRole('checkbox', { name: 'Lunes' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: 'Miércoles' })).toHaveAttribute('aria-checked', 'false');
    expect(formData().get('template_id')).toBe('t-1');
    expect(formData().getAll('routine_days')).toEqual(['monday', 'tuesday', 'thursday', 'friday']);
    await user.click(screen.getByRole('checkbox', { name: 'Martes' }));
    await user.click(screen.getByRole('checkbox', { name: 'Miércoles' }));
    expect(formData().getAll('routine_days')).toEqual(['monday', 'wednesday', 'thursday', 'friday']);
  });

  it('muestra los errores del backend en la plantilla y en los días', async () => {
    const user = setupUser();
    renderField({ errors: { template_id: 'Plantilla no encontrada', routine_days: 'Elegí al menos un día' } });
    await vi.waitFor(() => expect(screen.getByLabelText('Plantilla inicial')).toBeEnabled());
    expect(screen.getByLabelText('Plantilla inicial')).toHaveAccessibleDescription('Plantilla no encontrada');
    await user.selectOptions(screen.getByLabelText('Plantilla inicial'), 't-2');
    expect(screen.getByText('Elegí al menos un día')).toBeInTheDocument();
  });

  it('sin plantillas lo dice y no muestra el selector', async () => {
    renderField({ templates: [] });
    expect(await screen.findByText('Todavía no tenés plantillas')).toBeInTheDocument();
    expect(screen.queryByLabelText('Plantilla inicial')).not.toBeInTheDocument();
  });

  it('mientras carga el selector queda deshabilitado', () => {
    renderField({ templates: 'never' });
    expect(screen.getByLabelText('Plantilla inicial')).toBeDisabled();
    expect(options()).toEqual(['Cargando plantillas…']);
  });

  it('si no cargan queda deshabilitado con el aviso', async () => {
    renderField({ templates: 500 });
    expect(await screen.findByRole('option', { name: 'No pudimos cargar tus plantillas' })).toBeInTheDocument();
    expect(screen.getByLabelText('Plantilla inicial')).toBeDisabled();
  });
});
