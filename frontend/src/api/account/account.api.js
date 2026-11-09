import { api, request } from '@/api/shared/client';

/**
 * PUT /auth/password → `{ token, expires_in, password_changed_at }`.
 * Va con Bearer (también con la clave blanqueada); `refresh_token` es la sesión que se conserva.
 */
export function changePassword({ current_password, new_password, refresh_token }) {
  return request('/auth/password', {
    method: 'PUT',
    body: { current_password, new_password, refresh_token },
  });
}

/** POST /students/:id/password-reset (PT dueño) → `{ temporary_password }`. */
export function resetStudentPassword(studentId) {
  return api.post(`/students/${encodeURIComponent(studentId)}/password-reset`);
}

/** GET /students/:id/export (un alumno) o /students/export (todos los del PT) → el CSV como texto. */
export function exportSessions(studentId) {
  return api.get(studentId ? `/students/${encodeURIComponent(studentId)}/export` : '/students/export');
}
