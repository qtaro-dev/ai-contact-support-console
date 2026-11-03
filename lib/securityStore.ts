import { randomUUID } from 'node:crypto';
import { ApiError, readLimitedBody } from '@/lib/apiSecurity';
import { securityPolicy } from '@/lib/securityPolicy';

export interface SecurityStore {
  consume(key: string, limit: number, windowMs: number): Promise<boolean>;
  acquire(key: string, limit: number, ttlMs: number): Promise<string | null>;
  release(key: string, token: string): Promise<void>;
  put(key: string, ttlMs: number): Promise<void>;
  has(key: string): Promise<boolean>;
  remove(key: string): Promise<void>;
}

// Exported for deterministic tests. Only one explicitly selected process is covered.
export class MemorySecurityStore implements SecurityStore {
  private entries = new Map<string, { expires: number; count: number }>();
  constructor(private now = Date.now) {}
  private clean() {
    for (const [key, item] of this.entries) {
      if (item.expires <= this.now()) this.entries.delete(key);
    }
  }
  private set(key: string, count: number, ttlMs: number) {
    this.clean();
    if (!this.entries.has(key) && this.entries.size >= securityPolicy.memoryMaxEntries) {
      throw new ApiError('unavailable', 503);
    }
    this.entries.set(key, { expires: this.now() + ttlMs, count });
  }
  async consume(key: string, limit: number, windowMs: number) {
    this.clean();
    const item = this.entries.get(key);
    if (item) return ++item.count <= limit;
    this.set(key, 1, windowMs);
    return true;
  }
  async acquire(key: string, limit: number, ttlMs: number) {
    this.clean();
    const prefix = `${key}:`;
    if ([...this.entries.keys()].filter(k => k.startsWith(prefix)).length >= limit) return null;
    const token = randomUUID();
    this.set(`${prefix}${token}`, 1, ttlMs);
    return token;
  }
  async release(key: string, token: string) { this.entries.delete(`${key}:${token}`); }
  async put(key: string, ttlMs: number) { this.set(key, 1, ttlMs); }
  async has(key: string) { this.clean(); return this.entries.has(key); }
  async remove(key: string) { this.entries.delete(key); }
}

// EVAL makes read/check/write atomic across all application instances.
const rateScript = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
if n <= tonumber(ARGV[1]) then return 1 else return 0 end`;
const leaseScript = `
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[1]) then return 0 end
redis.call('ZADD', KEYS[1], now + tonumber(ARGV[2]), ARGV[3])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1`;

export class RedisSecurityStore implements SecurityStore {
  constructor(private url: string, private token: string) {}
  private async command(args: (string | number)[]): Promise<unknown> {
    try {
      const signal = AbortSignal.timeout(securityPolicy.storeTimeoutMs);
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        cache: 'no-store',
        signal
      });
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new ApiError('unavailable', 503);
      }
      const data = JSON.parse(await readLimitedBody(response, 4096, signal));
      if (!data || data.error || !('result' in data)) throw new ApiError('unavailable', 503);
      return data.result;
    } catch {
      throw new ApiError('unavailable', 503);
    }
  }
  private key(key: string) { return `ai-support:${key}`; }
  async consume(key: string, limit: number, windowMs: number) {
    const result = await this.command(['EVAL', rateScript, 1, this.key(key), limit, windowMs]);
    if (result !== 0 && result !== 1) throw new ApiError('unavailable', 503);
    return result === 1;
  }
  async acquire(key: string, limit: number, ttlMs: number) {
    const token = randomUUID();
    const result = await this.command(['EVAL', leaseScript, 1, this.key(key), limit, ttlMs, token]);
    if (result !== 0 && result !== 1) throw new ApiError('unavailable', 503);
    return result === 1 ? token : null;
  }
  async release(key: string, token: string) { await this.command(['ZREM', this.key(key), token]); }
  async put(key: string, ttlMs: number) {
    if (await this.command(['SET', this.key(key), '1', 'PX', ttlMs]) !== 'OK') {
      throw new ApiError('unavailable', 503);
    }
  }
  async has(key: string) { return await this.command(['EXISTS', this.key(key)]) === 1; }
  async remove(key: string) { await this.command(['DEL', this.key(key)]); }
}

const globalStore = globalThis as typeof globalThis & { supportSecurityStore?: MemorySecurityStore };
export const getSecurityStore = (): SecurityStore => {
  const mode = process.env.SECURITY_STORE || (process.env.NODE_ENV === 'production' ? 'redis' : 'memory');
  if (mode === 'memory' && process.env.VERCEL !== '1' &&
      (process.env.NODE_ENV !== 'production' || process.env.SECURITY_SINGLE_PROCESS === 'true')) {
    return globalStore.supportSecurityStore ??= new MemorySecurityStore();
  }
  const explicitUrl = process.env.SECURITY_REDIS_REST_URL;
  const explicitToken = process.env.SECURITY_REDIS_REST_TOKEN;
  // Select one complete setting family. Even an explicitly empty/partial family
  // is a configuration error, not permission to mix credentials or fall back.
  const useExplicit = explicitUrl !== undefined || explicitToken !== undefined;
  const url = useExplicit ? explicitUrl : process.env.KV_REST_API_URL;
  const token = useExplicit ? explicitToken : process.env.KV_REST_API_TOKEN;
  if (mode !== 'redis' || !url?.trim() || !token?.trim()) throw new ApiError('unavailable', 503);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error();
    }
  } catch { throw new ApiError('unavailable', 503); }
  return new RedisSecurityStore(url, token);
};

export const enforceRateLimit = async (key: 'chat' | 'login') => {
  const isLogin = key === 'login';
  const windowMs = isLogin ? securityPolicy.loginWindowMs : 60000;
  const limit = isLogin ? securityPolicy.loginAttemptsPerWindow : securityPolicy.chatRequestsPerMinute;
  if (!await getSecurityStore().consume(`rate:${key}`, limit, windowMs)) {
    throw new ApiError('rateLimited', 429, windowMs / 1000);
  }
};
