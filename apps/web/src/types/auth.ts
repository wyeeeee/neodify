export interface LoginRequest {
  username: string
  password: string
}

export interface AuthSession {
  token: string
  expiresAt: string
  username: string
}
