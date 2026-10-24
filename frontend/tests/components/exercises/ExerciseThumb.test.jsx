import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExerciseThumb from '@/components/exercises/ExerciseThumb';

describe('ExerciseThumb', () => {
  it('al cambiar el link vuelve a intentar la imagen tras un error', () => {
    const { container, rerender } = render(<ExerciseThumb url="https://youtu.be/abc123def45" />);
    fireEvent.error(container.querySelector('img'));
    expect(screen.getByTestId('thumb-placeholder')).toBeInTheDocument();
    rerender(<ExerciseThumb url="https://youtu.be/zzz123def45" />);
    expect(container.querySelector('img')).toBeInTheDocument();
  });
});
