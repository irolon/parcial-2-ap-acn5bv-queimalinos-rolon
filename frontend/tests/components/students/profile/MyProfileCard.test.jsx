import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import MyProfileCard from '@/components/students/profile/MyProfileCard';
import { renderOwn, selfDetail } from '../../../helpers/students/self';

const render = renderOwn;

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

  it('muestra el teléfono, o "Sin cargar" si no tiene', () => {
    const { unmount } = render(<MyProfileCard student={selfDetail({ phone: '+54 9 11 2233-4455' })} />);
    expect(screen.getByText('Teléfono').nextElementSibling).toHaveTextContent('+54 9 11 2233-4455');
    unmount();
    render(<MyProfileCard student={selfDetail({ phone: null })} />);
    expect(screen.getByText('Teléfono').nextElementSibling).toHaveTextContent('Sin cargar');
  });

  it('avisa que objetivo y nivel los define el entrenador/a', () => {
    render(<MyProfileCard student={selfDetail()} />);
    expect(screen.getByText('Objetivo y nivel los define tu entrenador/a')).toBeVisible();
    expect(screen.queryByText('Para cambiar tus datos, hablá con tu entrenador')).toBeNull();
  });

  it('las únicas acciones son Cambiar foto y Editar datos (y Quitar si hay foto), sin campos a la vista', () => {
    const { unmount } = render(<MyProfileCard student={selfDetail()} />);
    const names = () => screen.getAllByRole('button').map((button) => button.textContent).sort();
    expect(names()).toEqual(['Cambiar foto', 'Editar datos']);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    unmount();
    render(<MyProfileCard student={selfDetail({ avatar_url: 'https://storage.test/a.jpg' })} />);
    expect(names()).toEqual(['Cambiar foto', 'Editar datos', 'Quitar']);
  });

  it('con foto la muestra en el avatar de 84 px', () => {
    render(<MyProfileCard student={selfDetail({ avatar_url: 'https://storage.test/a.jpg' })} />);
    const photo = document.querySelector('img');
    expect(photo).toHaveAttribute('src', 'https://storage.test/a.jpg');
    expect(photo.parentElement).toHaveStyle({ width: '84px' });
  });
});
