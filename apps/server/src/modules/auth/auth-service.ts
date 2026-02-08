import crypto from 'node:crypto';

export interface AuthSession {
  token: string;
  expiresAt: string;
}

export interface AuthPrincipal {
  username: string;
  expiresAt: Date;
}

function safeEqualString(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left, 'utf8');
  const rightBuf = Buffer.from(right, 'utf8');
  if (leftBuf.length !== rightBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export class AuthService {
  private readonly username: string;
  private readonly password: string;
  private readonly secret: string;
  private readonly tokenTtlSec: number;

  constructor(env = process.env) {
    const username = env.AUTH_USERNAME;
    const password = env.AUTH_PASSWORD;
    const secret = env.AUTH_TOKEN_SECRET;

    if (!username || !password || !secret) {
      throw new Error('AUTH_USERNAME、AUTH_PASSWORD、AUTH_TOKEN_SECRET 必须在 .env 中配置');
    }

    this.username = username;
    this.password = password;
    this.secret = secret;
    this.tokenTtlSec = Number(env.AUTH_TOKEN_TTL_SEC ?? '86400');
  }

  login(username: string, password: string): AuthSession | null {
    const userOk = safeEqualString(this.username, username);
    const passOk = safeEqualString(this.password, password);
    if (!userOk || !passOk) {
      return null;
    }

    const expiresAtEpoch = Math.floor(Date.now() / 1000) + this.tokenTtlSec;
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${this.username}.${expiresAtEpoch}.${nonce}`;
    const signature = this.sign(payload);
    const token = `${toBase64Url(payload)}.${signature}`;

    return {
      token,
      expiresAt: new Date(expiresAtEpoch * 1000).toISOString()
    };
  }

  verifyToken(token: string): AuthPrincipal | null {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [payloadPart, signature] = parts;
    if (!payloadPart || !signature) {
      return null;
    }

    let payload = '';
    try {
      payload = fromBase64Url(payloadPart);
    } catch {
      return null;
    }

    const expectedSig = this.sign(payload);
    if (!safeEqualString(expectedSig, signature)) {
      return null;
    }

    const payloadSegments = payload.split('.');
    if (payloadSegments.length !== 3) {
      return null;
    }
    const [username, expiresAtSecRaw] = payloadSegments;
    const expiresAtSec = Number(expiresAtSecRaw);
    if (!username || Number.isNaN(expiresAtSec)) {
      return null;
    }
    if (!safeEqualString(username, this.username)) {
      return null;
    }
    if (Math.floor(Date.now() / 1000) > expiresAtSec) {
      return null;
    }

    return {
      username,
      expiresAt: new Date(expiresAtSec * 1000)
    };
  }

  extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }
    const [scheme, token] = authHeader.split(' ');
    if (!scheme || !token) {
      return null;
    }
    if (!safeEqualString(scheme.toLowerCase(), 'bearer')) {
      return null;
    }
    return token;
  }

  private sign(payload: string): string {
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
  }
}
