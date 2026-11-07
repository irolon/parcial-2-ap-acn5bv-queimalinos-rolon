import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/shared/client';
import { chatProblem, remainingText } from '@/utils/chat/chatProblem';

const apiError = (status, code, message = code) => new ApiError({ status, code, message });

describe('chatProblem', () => {
  it('sin error no hay problema', () => {
    expect(chatProblem(null)).toBeNull();
  });

  it('cada error del asistente tiene su aviso y dice si se puede reintentar', () => {
    expect(chatProblem(apiError(429, 'CHAT_LIMIT_REACHED'))).toEqual({
      kind: 'limit', text: 'Llegaste al límite de consultas de hoy. Mañana podés seguir.', retry: false,
    });
    expect(chatProblem(apiError(0, 'NETWORK_ERROR'))).toEqual({
      kind: 'offline', text: 'El asistente necesita conexión', retry: true,
    });
    expect(chatProblem(apiError(503, 'AI_UNAVAILABLE'))).toEqual({
      kind: 'unavailable', text: 'El asistente no está disponible ahora. Seguí con tu entrenamiento.', retry: true,
    });
    expect(chatProblem(apiError(502, 'AI_INVALID_RESPONSE'))).toEqual({
      kind: 'invalid', text: 'El asistente respondió algo que no entendimos. Probá de nuevo.', retry: true,
    });
  });

  it('sesión terminada o ajena: el texto del servidor, sin reintentar', () => {
    expect(chatProblem(apiError(400, 'SESSION_FINISHED', 'La sesión ya terminó.'))).toEqual({
      kind: 'session', text: 'La sesión ya terminó.', retry: false,
    });
    expect(chatProblem(apiError(404, 'SESSION_NOT_FOUND', 'Sesión no encontrada'))).toMatchObject({ kind: 'session' });
  });

  it('cualquier otro error (o algo que no es un ApiError) cuenta como no disponible', () => {
    expect(chatProblem(apiError(500, 'INTERNAL')).kind).toBe('unavailable');
    expect(chatProblem(new Error('boom')).kind).toBe('unavailable');
  });
});

describe('remainingText', () => {
  it('en singular solo con 1', () => {
    expect(remainingText(17)).toBe('Te quedan 17 consultas hoy');
    expect(remainingText(1)).toBe('Te queda 1 consulta hoy');
    expect(remainingText(0)).toBe('Te quedan 0 consultas hoy');
  });
});
