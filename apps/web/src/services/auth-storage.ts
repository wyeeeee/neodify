import type { AuthSession } from '../types/auth'

const AUTH_STORAGE_KEY = 'neodify.auth.session'

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function loadAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (!parsed.token || !parsed.expiresAt || !parsed.username) {
      return null
    }
    return {
      token: parsed.token,
      expiresAt: parsed.expiresAt,
      username: parsed.username
    }
  } catch {
    return null
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
