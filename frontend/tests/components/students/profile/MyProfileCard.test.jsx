import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyProfileCard from '@/components/students/profile/MyProfileCard';
import { selfDetail } from '../../../helpers/students/self';

describe('MyProfileCard', () => {
  it('muestra el avatar, el nombre y el email', () => {
    render(<MyProfileCard student={selfDetail()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Tomás Ruiz' })).toBeVisible();
    expect(screen.getByText('tomas@fit.com')).toBeVisible();
    expect(screen.getByText('TR')).toBeInTheDocument();
  });

  it('traduce el objetivo y el nivel', () => {
    render(<MyProfileCard student={selfDetail({ goal: 'weight_loss', level: 'advanced' })} />);
    expect(screen.getByText('Objetivo').nextElementSibling).toHaveTextContent('Bajar de peso');
    expect(screen.getByText('Nivel').nextElementSibling).toHaveTextContent('Avanzado');
  });

  it('sin objetivo, sin nivel o con valores que no conoce dice "Sin definir"', () => {
    render(<MyProfileCard student={selfDetail({ goal: null, level: 'experto' })} />);
    expect(screen.getByText('Objetivo').nextElementSibling).toHaveTextContent('Sin definir');
    expect(screen.getByText('Nivel').nextElementSibling).toHaveTextContent('Sin definir');
  });

  it('avisa que los datos los cambia el entrenador', () => {
    render(<MyProfileCard student={selfDetail()} />);
    expect(screen.getByText('Para cambiar tus datos, hablá con tu entrenador')).toBeVisible();
  });

  it('es de solo lectura: ni campos, ni botones, ni links', () => {
    render(<MyProfileCard student={selfDetail()} />);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
