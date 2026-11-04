import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

export const adminSessionCookieName = 'admin_session';
export const adminSessionMaxAgeSeconds = 60 * 60 * 12;
const textEncoder = new TextEncoder();

const getAdminSessionSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
};
const getAdminPassword = () => process.env.ADMIN_PASSWORD || null;

const sign = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw', textEncoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  // Password rotation also invalidates previously signed sessions.
  const passwordDigest = createHash('sha256').update(getAdminPassword() || '').digest('hex');
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(`${payload}.${passwordDigest}`));
  return Buffer.from(signature).toString('hex');
};

const safeCompare = (left: string, right: string) =>
  timingSafeEqual(createHash('sha256').update(left).digest(), createHash('sha256').update(right).digest());

export const verifyAdminPassword = (password: string) => {
  const configuredPassword = getAdminPassword();
  return Boolean(configuredPassword && safeCompare(password, configuredPassword));
};

export const createAdminSessionValue = async () => {
  const secret = getAdminSessionSecret();
  if (!secret || !getAdminPassword()) return null;
  const expiresAt = Date.now() + adminSessionMaxAgeSeconds * 1000;
  const sessionId = randomUUID();
  const payload = `${expiresAt}.${sessionId}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
};

const verifiedSessionId = async (sessionValue: string | undefined) => {
  const secret = getAdminSessionSecret();
  if (!secret || !getAdminPassword() || !sessionValue || sessionValue.length > 160) return null;
  const match = /^(\d{13})\.([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9a-f]{64})$/.exec(sessionValue);
  // Verify the signed expiry without an upper bound relative to this
  // instance's clock, which may be slightly behind the issuing instance.
  if (!match || Number(match[1]) <= Date.now()) return null;
  const expected = await sign(`${match[1]}.${match[2]}`, secret);
  return safeCompare(match[3], expected) ? match[2] : null;
};

export const isValidAdminSession = async (sessionValue: string | undefined) => {
  return (await verifiedSessionId(sessionValue)) !== null;
};

export const getAdminCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: adminSessionMaxAgeSeconds
});
