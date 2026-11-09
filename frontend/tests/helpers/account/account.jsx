import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { errorResponse } from '../shared/fetchMock';

/** Respuesta CSV como la del export (con BOM). */
export const csvResponse = (body = '﻿Fecha;Hora\r\n') =>
  new Response(body, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8' } });

/** 400 de `PUT /auth/password` con la actual incorrecta. */
export const wrongCurrentResponse = () =>
  errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', [
    { field: 'current_password', message: 'La contraseña actual es incorrecta' },
  ]);

/** Sesión en el store, sin pasar por el login. */
export function setStoreSession(user, { token = 'access-1', refreshToken = 'refresh-1' } = {}) {
  useAuthStore.setState({ user, token, refreshToken, status: 'authenticated' });
}

/** Renderiza `ui` con un QueryClient nuevo y sin reintentos. */
export function renderWithQuery(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** Completa los tres campos del cambio de clave. */
export async function fillPasswordForm(user, { current = 'Viej4clave', next = 'Nuev4clave', repeat = next } = {}) {
  const fields = [
    [/actual|temporal/i, current],
    [/^nueva contraseña$/i, next],
    [/repetir nueva/i, repeat],
  ];
  for (const [label, value] of fields) {
    if (value) await user.type(screen.getByLabelText(label), value);
  }
}
