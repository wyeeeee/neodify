import type { AuthSession, LoginRequest } from '../types/auth'

interface LoginResponse {
  ok: boolean
  token?: string
  expiresAt?: string
  username?: string
  message?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function parseLoginResponse(response: Response): Promise<LoginResponse> {
  const raw = await response.text()
  const content = raw.trim()

  if (!content) {
    return {
      ok: false,
      message: `登录接口返回空响应（HTTP ${response.status}）`
    }
  }

  try {
    return JSON.parse(content) as LoginResponse
  } catch {
    return {
      ok: false,
      message: `登录接口返回了非 JSON 数据（HTTP ${response.status}）`
    }
  }
}

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

  const json = await parseLoginResponse(response)
  if (!response.ok || !json.ok || !json.token || !json.expiresAt || !json.username) {
    throw new Error(json.message ?? `登录失败（HTTP ${response.status}）`)
  }

  return {
    token: json.token,
    expiresAt: json.expiresAt,
    username: json.username
  }
}
