export const adminSessionCookieName = 'admin_session';
export const adminSessionMaxAgeSeconds = 60 * 60 * 12;

// Portfolio/demo-only admin auth. Replace with full account authentication before production use.
const textEncoder = new TextEncoder();

const getAdminSessionSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    console.warn('ADMIN_SESSION_SECRET is not set. Admin authentication is disabled.');
    return null;
  }

  return secret;
};

const getAdminPassword = () => process.env.ADMIN_PASSWORD || null;

const toHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const sign = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));

  return toHex(signature);
};

const safeCompare = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
};

export const verifyAdminPassword = (password: string) => {
  const configuredPassword = getAdminPassword();

  if (!configuredPassword) {
    return false;
  }

  return safeCompare(password, configuredPassword);
};

export const createAdminSessionValue = async () => {
  const secret = getAdminSessionSecret();

  if (!secret) {
    return null;
  }

  const expiresAt = Date.now() + adminSessionMaxAgeSeconds * 1000;
  const payload = String(expiresAt);
  const signature = await sign(payload, secret);

  return `${payload}.${signature}`;
};

export const isValidAdminSession = async (sessionValue: string | undefined) => {
  const secret = getAdminSessionSecret();

  if (!secret || !sessionValue) {
    return false;
  }

  const [expiresAtText, signature] = sessionValue.split('.');

  if (!expiresAtText || !signature) {
    return false;
  }

  const expiresAt = Number(expiresAtText);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const expectedSignature = await sign(expiresAtText, secret);

  return safeCompare(signature, expectedSignature);
};

export const getAdminCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: adminSessionMaxAgeSeconds
});
