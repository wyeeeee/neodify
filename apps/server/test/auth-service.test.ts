import { describe, expect, test } from 'vitest';
import { AuthService } from '../src/modules/auth/auth-service.js';

function createService(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return new AuthService({
    AUTH_USERNAME: 'admin',
    AUTH_PASSWORD: 'password123',
    AUTH_TOKEN_SECRET: 'super-secret-key',
    AUTH_TOKEN_TTL_SEC: '3600',
    ...overrides
  });
}

describe('AuthService', () => {
  test('login success and verify token', () => {
    const service = createService();
    const session = service.login('admin', 'password123');
    expect(session).toBeTruthy();
    expect(session?.token).toBeTruthy();

    const principal = service.verifyToken(session!.token);
    expect(principal?.username).toBe('admin');
  });

  test('login failed with wrong password', () => {
    const service = createService();
    const session = service.login('admin', 'wrong-password');
    expect(session).toBeNull();
  });

  test('extract bearer token', () => {
    const service = createService();
    expect(service.extractBearerToken('Bearer abc-token')).toBe('abc-token');
    expect(service.extractBearerToken('Basic x')).toBeNull();
    expect(service.extractBearerToken(undefined)).toBeNull();
  });
});
