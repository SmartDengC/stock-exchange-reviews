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

/**
 * 在页面卸载期间发送登出请求。
 * 使用 navigator.sendBeacon（同步排队，浏览器保证发出）
 * 而非 fetch+keepalive（异步发起，页面销毁前可能来不及发出）。
 * sendBeacon 自动携带同源 HttpOnly cookie。
 */
function postLogoutBeacon() {
  return navigator.sendBeacon('/api/auth/logout');
}

function sessionUser(response: SessionResponse): null | SessionUser {
  return response.loggedIn ? response.user : null;
}

export { fetchSession, login, logout, postLogoutBeacon, sessionUser };
