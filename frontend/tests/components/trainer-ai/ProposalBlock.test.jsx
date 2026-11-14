import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ProposalBlock from '@/components/trainer-ai/ProposalBlock';
import { aiItem } from '../../helpers/trainer-ai/fixtures';

const BLOCK = { name: 'Empuje', days: ['monday'], exercises: [aiItem('ex-bench', 'Press banca plano'), aiItem('ex-incline', 'Press inclinado con mancuernas')] };
const ANA = { studentId: 'st-9', studentName: 'Ana Paz' };
const renderBlock = (assigned) =>
  render(<MemoryRouter><ProposalBlock block={BLOCK} editHref="/pt/rutinas/nueva" assigned={assigned} /></MemoryRouter>);
const rows = () => screen.getAllByRole('row').slice(1).map((row) => row.cells[1].textContent);

describe('ProposalBlock', () => {
  it('asignado con cambios: muestra lo asignado y "Asignado · con tus cambios", con el link a la ficha', () => {
    const block = { name: 'Empuje fuerte', days: ['tuesday'], exercises: [aiItem('ex-plank', 'Plancha', { sets: 5, reps: 1 })] };
    renderBlock({ ...ANA, routineId: 'r-1', block });
    expect(screen.getByRole('heading', { name: 'Empuje fuerte' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Días: Martes' })).toBeVisible();
    expect(rows()).toEqual(['Plancha']);
    expect(screen.getByText('5 × 1')).toBeVisible();
    expect(screen.getByText('Asignado · con tus cambios')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver la rutina en la ficha de Ana Paz' })).toHaveAttribute('href', '/pt/alumnos/st-9');
  });

  it('asignado sin cambios: solo "Asignado"', () => {
    renderBlock({ ...ANA, block: BLOCK });
    expect(screen.getByText('Asignado')).toBeVisible();
    expect(screen.queryByText(/con tus cambios/)).not.toBeInTheDocument();
    expect(rows()).toEqual(['Press banca plano', 'Press inclinado con mancuernas']);
  });

  it('asignado de antes (sin lo asignado guardado): la propuesta y "Asignado"', () => {
    renderBlock(ANA);
    expect(screen.getByText('Asignado')).toBeVisible();
    expect(rows()).toEqual(['Press banca plano', 'Press inclinado con mancuernas']);
  });

  it('sin asignar: la propuesta y "Editar y asignar"', () => {
    renderBlock(undefined);
    expect(screen.getByRole('link', { name: 'Editar y asignar' })).toHaveAttribute('href', '/pt/rutinas/nueva');
  });

  it('el peso sugerido va con coma decimal, como en el resto de la app ("32,5 kg"), y sin peso una raya', () => {
    const block = { ...BLOCK, exercises: [aiItem('ex-bench', 'Press banca plano', { suggested_kg: 32.5 }), aiItem('ex-incline', 'Press inclinado con mancuernas')] };
    render(<MemoryRouter><ProposalBlock block={block} editHref="/pt/rutinas/nueva" /></MemoryRouter>);
    const kgCells = screen.getAllByRole('row').slice(1).map((row) => row.cells[4].textContent);
    expect(kgCells).toEqual(['32,5 kg', '—']);
  });
});
