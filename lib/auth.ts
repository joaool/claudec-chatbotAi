import { SignJWT, jwtVerify } from 'jose';

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export async function signSuperAdminToken(): Promise<string> {
  return new SignJWT({ role: 'superadmin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());
}

export async function signClientToken(clientId: string, slug: string): Promise<string> {
  return new SignJWT({ role: 'client', clientId, slug })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());
}

export interface TokenPayload {
  role: 'superadmin' | 'client';
  clientId?: string;
  slug?: string;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role === 'superadmin') return { role: 'superadmin' };
    if (payload.role === 'client' && payload.clientId && payload.slug) {
      return { role: 'client', clientId: payload.clientId as string, slug: payload.slug as string };
    }
    return null;
  } catch {
    return null;
  }
}
