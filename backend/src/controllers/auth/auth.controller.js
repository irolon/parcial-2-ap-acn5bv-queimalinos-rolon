import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import * as authService from '../../services/auth/auth.service.js';
import * as passwordService from '../../services/auth/password.service.js';

/** POST /auth/register — registra un trainer. 201 → { trainer, token, refresh_token } */
export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

/** POST /auth/login — 200 → { user, token, refresh_token, expires_in } */
export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

/** POST /auth/refresh — 200 → { token, expires_in } */
export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body);
  res.json(result);
});

/** POST /auth/logout — 204 No Content */
export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body);
  res.status(204).send();
});

/** PUT /auth/password — 200 → { token, expires_in, password_changed_at } */
export const changePassword = asyncHandler(async (req, res) => {
  const result = await passwordService.changePassword(req.user, req.body);
  res.json(result);
});
