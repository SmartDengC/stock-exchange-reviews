import type {
  SessionResponse,
  SessionUser,
} from '#/shared/types/auth';

import { requestClient } from './request';

/**
 * 获取当前会话信息
 * 用于检查登录状态和获取用户信息
 * @returns 会话响应（包含 loggedIn 状态和用户信息）
 * @note Cookie 为 HttpOnly，前端通过此接口刷新状态
 */
function fetchSession() {
  return requestClient.get<SessionResponse>('/api/auth/session');
}

/**
 * 用户登录
 * @param credentials 登录凭证
 * @param credentials.username 用户名
 * @param credentials.password 密码
 * @returns 会话响应（成功后设置 HttpOnly Cookie）
 * @note 登录成功后返回 SessionResponse，包含用户信息
 */
function login(credentials: { password: string; username: string }) {
  return requestClient.post<SessionResponse>('/api/auth/login', credentials);
}

/**
 * 用户登出
 * 清除服务端会话和 Cookie
 * @returns { loggedIn: boolean } 登出结果
 * @note 登出后前端应清除本地状态并跳转到登录页
 */
function logout() {
  return requestClient.post<{ loggedIn: boolean }>('/api/auth/logout');
}

/**
 * 从会话响应中提取用户信息
 * @param response 会话响应
 * @returns 用户信息，未登录时返回 null
 */
function sessionUser(response: SessionResponse): null | SessionUser {
  return response.loggedIn ? response.user : null;
}

export { fetchSession, login, logout, sessionUser };
