import { NextResponse } from 'next/server';
import { apiErrorText } from '@/lib/chatUiText';
import { securityPolicy } from '@/lib/securityPolicy';

export type ApiErrorCode = keyof typeof apiErrorText;

export class ApiError extends Error {
  constructor(public code: ApiErrorCode, public status: number, public retryAfter?: number) {
    super(code);
  }
}

type SecurityEvent = ApiErrorCode | 'authorization_unavailable';
export const logSecurityEvent = (event: SecurityEvent) => {
  // Only static event identifiers; never log exceptions or request/provider data.
  console.error(JSON.stringify({ event }));
};

export const errorResponse = (error: unknown) => {
  const failure = error instanceof ApiError ? error : new ApiError('unavailable', 503);
  if (!(error instanceof ApiError) || failure.status >= 500) {
    logSecurityEvent(failure.code);
  }
  return NextResponse.json(
    { error: apiErrorText[failure.code], code: failure.code },
    {
      status: failure.status,
      headers: {
        'Cache-Control': 'no-store',
        ...(failure.retryAfter ? { 'Retry-After': String(failure.retryAfter) } : {})
      }
    }
  );
};

export const withAbort = async <T>(work: Promise<T>, signal: AbortSignal): Promise<T> => {
  if (signal.aborted) {
    void work.catch(() => {});
    throw new ApiError('timeout', 504);
  }
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new ApiError('timeout', 504));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([work, aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
};

export const readLimitedBody = async (
  request: Request | Response,
  maxBytes: number,
  signal: AbortSignal
) => {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    throw new ApiError('tooLarge', 413);
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await withAbort(reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new ApiError('tooLarge', 413);
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new ApiError('invalidRequest', 400);
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
};

export const getRequestOrigin = (request: Request) => {
  // Next's internal request URL can use localhost even when the browser used
  // 127.0.0.1. Compare against the original Host, not the internal server name.
  // Deploy behind an ingress that validates Host; APP_ORIGIN can pin the origin.
  if (process.env.APP_ORIGIN) {
    try {
      const configured = new URL(process.env.APP_ORIGIN);
      if (!['http:', 'https:'].includes(configured.protocol) || configured.username ||
          configured.password || configured.pathname !== '/' || configured.search || configured.hash) {
        throw new Error();
      }
      return configured.origin;
    }
    catch { throw new ApiError('unavailable', 503); }
  }
  const url = new URL(request.url);
  const host = request.headers.get('host');
  if (host) {
    if (/[\s/\\@?#]/.test(host)) throw new ApiError('forbidden', 403);
    url.host = host;
  }
  return url.origin;
};

export const verifyRequestOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if ((origin && origin !== getRequestOrigin(request)) ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new ApiError('forbidden', 403);
  }
};

export const parseChatMessage = (text: string): string => {
  let body: unknown;
  try { body = JSON.parse(text); } catch { throw new ApiError('invalidRequest', 400); }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError('invalidRequest', 400);
  }
  const values = body as Record<string, unknown>;
  const keys = ['message', 'userName', 'email'];
  if (Object.keys(values).some(key => !keys.includes(key)) ||
      typeof values.message !== 'string' ||
      (values.userName !== undefined && typeof values.userName !== 'string') ||
      (values.email !== undefined && typeof values.email !== 'string')) {
    throw new ApiError('invalidRequest', 400);
  }
  if (values.message.length > securityPolicy.messageMaxChars) {
    throw new ApiError('tooLarge', 413);
  }
  const message = values.message.trim();
  if (!message || (typeof values.userName === 'string' && values.userName.length > 100) ||
      (typeof values.email === 'string' && (values.email.length > 254 ||
       (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))))) {
    throw new ApiError('invalidRequest', 400);
  }
  return message;
};
