import type {
  SessionResponse,
  SessionUser,
} from '#/shared/types/auth';

import { requestClient } from './request';

function fetchSession() {
  return requestClient.get<SessionResponse>('/api/auth/session');
}

function login(credentials: { password: string; username: string }) {
  return requestClient.post<SessionResponse>('/api/auth/login', credentials);
}

function logout() {
  return requestClient.post<{ loggedIn: boolean }>('/api/auth/logout');
}

function sessionUser(response: SessionResponse): null | SessionUser {
  return response.loggedIn ? response.user : null;
}

export { fetchSession, login, logout, sessionUser };
