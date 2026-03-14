import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
