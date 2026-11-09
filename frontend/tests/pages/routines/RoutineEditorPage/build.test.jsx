import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { user } from '../../../helpers/shared/user';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { renderEditor, rowNames, warmUpEditor } from '../../../helpers/routines/editor';

beforeAll(warmUpEditor);

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const add = (name) => user.click(screen.getByRole('button', { name: `Agregar ${name}` }));

describe('RoutineEditorPage: armado', () => {
  it('con la biblioteca a la izquierda agrega ejercicios filtrando por músculo', async () => {
    await renderEditor();
    expect(screen.getByText('Agregá ejercicios desde la biblioteca')).toBeVisible();
    await user.click(within(screen.getByRole('radiogroup', { name: 'Grupo muscular' })).getByRole('radio', { name: 'Pecho' }));
    expect(screen.queryByRole('button', { name: 'Agregar Sentadilla' })).not.toBeInTheDocument();
    await add('Press banca plano');
    await add('Press inclinado con mancuernas');
    expect(rowNames()).toEqual(['Press banca plano', 'Press inclinado con mancuernas']);
    expect(screen.getByLabelText('Series de Press banca plano')).toHaveValue('3');
    expect(screen.getByLabelText('Reps de Press banca plano')).toHaveValue('10');
    expect(screen.getByLabelText('Descanso (s) de Press banca plano')).toHaveValue('90');
    expect(screen.getByLabelText('Peso (kg) de Press banca plano')).toHaveValue('');
  });

  it('edita series, reps y peso de una fila', async () => {
    await renderEditor();
    await add('Sentadilla');
    for (const [label, value] of [['Series', '5'], ['Reps', '12'], ['Peso (kg)', '42.5']]) {
      const input = screen.getByLabelText(`${label} de Sentadilla`);
      await user.clear(input);
      await user.type(input, value);
      expect(input).toHaveValue(value);
    }
  });

  it('el menú de la fila sube, baja y quita, con los bordes deshabilitados', async () => {
    await renderEditor();
    for (const name of ['Sentadilla', 'Plancha', 'Press banca plano']) await add(name);
    await user.click(screen.getByRole('button', { name: 'Opciones de Sentadilla' }));
    expect(screen.getByRole('menuitem', { name: 'Subir' })).toBeDisabled();
    await user.click(screen.getByRole('menuitem', { name: 'Bajar' }));
    expect(rowNames()).toEqual(['Plancha', 'Sentadilla', 'Press banca plano']);
    await user.click(screen.getByRole('button', { name: 'Opciones de Press banca plano' }));
    expect(screen.getByRole('menuitem', { name: 'Bajar' })).toBeDisabled();
    await user.click(screen.getByRole('menuitem', { name: 'Subir' }));
    expect(rowNames()).toEqual(['Plancha', 'Press banca plano', 'Sentadilla']);
    await user.click(screen.getByRole('button', { name: 'Opciones de Plancha' }));
    await user.click(screen.getByRole('menuitem', { name: 'Quitar' }));
    expect(rowNames()).toEqual(['Press banca plano', 'Sentadilla']);
  });

  it('cierra el menú al hacer clic afuera o con Escape y abre uno solo a la vez', async () => {
    await renderEditor();
    await add('Sentadilla');
    await add('Plancha');
    await user.click(screen.getByRole('button', { name: 'Opciones de Sentadilla' }));
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Opciones de Plancha' }));
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    await user.click(screen.getByLabelText('Nombre de la rutina'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Opciones de Plancha' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('el menú se maneja con teclado y devuelve el foco', async () => {
    await renderEditor();
    for (const name of ['Sentadilla', 'Plancha']) await add(name);
    screen.getByRole('button', { name: 'Opciones de Plancha' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', { name: 'Subir' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Bajar' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'Quitar' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Subir' })).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opciones de Plancha' })).toHaveFocus();
    await user.keyboard('{Enter}{Enter}');
    expect(rowNames()).toEqual(['Plancha', 'Sentadilla']);
    expect(screen.getByRole('button', { name: 'Opciones de Plancha' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(rowNames()).toEqual(['Sentadilla']);
    expect(screen.getByRole('button', { name: 'Opciones de Sentadilla' })).toHaveFocus();
  });

  it('abrir un menú con el teclado cierra el otro', async () => {
    await renderEditor();
    for (const name of ['Sentadilla', 'Plancha']) await add(name);
    screen.getByRole('button', { name: 'Opciones de Sentadilla' }).focus();
    await user.keyboard('{Enter}');
    screen.getByRole('button', { name: 'Opciones de Plancha' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('menu')).toHaveLength(1);
  });

  it('la topbar muestra el nombre de la rutina', async () => {
    await renderEditor();
    expect(await screen.findByRole('heading', { level: 1, name: 'Nueva rutina' })).toBeVisible();
    await user.type(screen.getByLabelText('Nombre de la rutina'), 'Fuerza A');
    expect(screen.getByRole('heading', { level: 1, name: 'Nueva rutina — Fuerza A' })).toBeVisible();
  });

  it('elige objetivo y días en la cabecera', async () => {
    await renderEditor();
    await user.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
    expect(screen.getByLabelText('Objetivo')).toHaveValue('strength');
    expect(screen.queryByRole('option', { name: 'Sin definir' })).not.toBeInTheDocument();
    const monday = screen.getByRole('checkbox', { name: 'Lunes' });
    await user.click(monday);
    expect(monday).toBeChecked();
    await user.click(monday);
    expect(monday).not.toBeChecked();
  });

  it('en pantallas chicas la biblioteca se abre desde "Agregar ejercicio"', async () => {
    await renderEditor();
    const toggle = screen.getByRole('button', { name: 'Agregar ejercicio' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
