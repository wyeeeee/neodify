import type { AuthSession, LoginRequest } from '../types/auth'

interface LoginResponse {
  ok: boolean
  token?: string
  expiresAt?: string
  username?: string
  message?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function login(payload: LoginRequest): Promise<AuthSession> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch {
    throw new Error('网络请求失败，请确认前后端服务已启动且代理配置正确')
  }

  const json = (await response.json()) as LoginResponse
  if (!response.ok || !json.ok || !json.token || !json.expiresAt || !json.username) {
    throw new Error(json.message ?? '登录失败')
  }

  return {
    token: json.token,
    expiresAt: json.expiresAt,
    username: json.username
  }
}
