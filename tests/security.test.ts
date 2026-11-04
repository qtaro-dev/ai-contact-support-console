import assert from 'node:assert/strict';
import { beforeEach, test, mock } from 'node:test';
import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as chat } from '@/app/api/chat/route';
import { POST as login } from '@/app/api/admin-login/route';
import { POST as logout } from '@/app/api/admin-logout/route';
import { createAdminSessionValue, isValidAdminSession, verifyAdminPassword, getAdminCookieOptions } from '@/lib/adminAuth';
import { ApiError, readLimitedBody, withAbort } from '@/lib/apiSecurity';
import { getSafeRedirectPath, securityPolicy } from '@/lib/securityPolicy';
import { assessCustomerHarassment } from '@/lib/customerHarassment';
import { generateAiAnswer, getAiGenerationConfig } from '@/lib/aiProvider';
import { aiProviderText } from '@/lib/chatUiText';
import { proxy } from '@/proxy';

beforeEach(() => {
  mock.restoreAll();
  process.env.AI_PROVIDER = 'demo';
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.APP_ORIGIN;
  delete process.env.VERCEL;
  delete process.env.OLLAMA_API_BASE;
  delete process.env.OLLAMA_API_URL;
  delete process.env.OLLAMA_MODEL;
});

const chatRequest = (body: string, headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body
  });
const credentials = () => {
  process.env.ADMIN_PASSWORD = randomBytes(24).toString('hex');
  process.env.ADMIN_SESSION_SECRET = randomBytes(32).toString('hex');
};
const loginRequest = (password: string, redirect = '/admin') => new NextRequest('http://localhost/api/admin-login', {
  method: 'POST', body: new URLSearchParams({ password, redirect }),
  headers: { origin: 'http://localhost' }
});

test('unset or empty AI_PROVIDER keeps the existing Ollama default without contacting it', () => {
  const network = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected fetch'); });
  delete process.env.AI_PROVIDER;
  assert.equal(getAiGenerationConfig().provider, 'ollama');
  process.env.AI_PROVIDER = '';
  assert.equal(getAiGenerationConfig().provider, 'ollama');
  assert.equal(network.mock.callCount(), 0);
});

test('demo answers and risk assessments work without any outbound fetch', async () => {
  const network = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network'); });
  for (const [message, level, answer] of [
    ['配送状況を教えてください', 'none', aiProviderText.demo.normal],
    ['対応が遅いので困っています', 'low', aiProviderText.demo.normal],
    ['毎日何度でも連絡', 'medium', aiProviderText.demo.medium],
    ['殺す', 'high', aiProviderText.demo.high],
    ['性的', 'medium', aiProviderText.demo.sexual],
    ['死にたい', 'high', aiProviderText.demo.selfHarm]
  ]) {
    const response = await chat(chatRequest(JSON.stringify({ message })));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.answer, answer);
    assert.equal(result.harassmentAssessment.level, level);
  }
  assert.equal(network.mock.callCount(), 0);
});

test('reject invalid JSON, shape, types and empty messages with a uniform safe error', async () => {
  for (const body of ['{', 'null', '[]', 'true', '1', '"text"', '{}', '{"message":0}',
    '{"message":[]}', '{"message":"  "}', '{"message":"ok","email":3}',
    '{"message":"ok","userName":{}}', '{"message":"ok","unknown":true}',
    '{"message":"ok","email":"invalid"}']) {
    const response = await chat(chatRequest(body));
    assert.equal(response.status, 400, body);
    const result = await response.json();
    assert.deepEqual(Object.keys(result).sort(), ['code', 'error']);
    assert.equal(result.code, 'invalidRequest');
  }
});

test('enforce exact message boundary and full request byte limits', async () => {
  assert.equal((await chat(chatRequest(JSON.stringify({ message: 'a'.repeat(4000) })))).status, 200);
  assert.equal((await chat(chatRequest(JSON.stringify({ message: 'a'.repeat(4001) })))).status, 413);
  assert.equal((await chat(chatRequest(' '.repeat(securityPolicy.requestMaxBytes + 1)))).status, 413);
  assert.equal((await chat(chatRequest('{}', { 'content-length': '999999' }))).status, 413);
  // No content-length; the streaming reader must still enforce the limit.
  const body = new Response(new ReadableStream({ start(c) {
    c.enqueue(new Uint8Array(16)); c.enqueue(new Uint8Array(17)); c.close();
  } }));
  await assert.rejects(readLimitedBody(body, 32, new AbortController().signal), (e: unknown) => e instanceof ApiError && e.status === 413);
});

test('reject foreign origins and unsupported content types', async () => {
  assert.equal((await chat(chatRequest('{"message":"ok"}', { origin: 'https://other.invalid' }))).status, 403);
  assert.equal((await chat(chatRequest('{}', { 'content-type': 'text/plain' }))).status, 415);
  assert.equal((await chat(chatRequest('{"message":"ok"}', {
    origin: 'http://127.0.0.1:3100', host: '127.0.0.1:3100'
  }))).status, 200);
});

test('body reading and processing deadlines terminate pending promises', async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10);
  await assert.rejects(withAbort(new Promise(() => {}), controller.signal), (e: unknown) => e instanceof ApiError && e.status === 504);
  clearTimeout(timer);
  const body = new Response(new ReadableStream());
  await assert.rejects(readLimitedBody(body, 32, controller.signal), (e: unknown) => e instanceof ApiError && e.status === 504);
});

test('unconfigured credentials deny login; secrets must be at least 32 characters', async () => {
  assert.equal(verifyAdminPassword(''), false);
  assert.equal(await createAdminSessionValue(), null);
  credentials();
  process.env.ADMIN_SESSION_SECRET = 'short';
  assert.equal(await createAdminSessionValue(), null);
});

test('successful login preserves cookie protections and only safe redirect destinations', async () => {
  credentials();
  const response = await login(loginRequest(process.env.ADMIN_PASSWORD!, '/settings'));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'http://localhost/settings');
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, /Max-Age=43200/i);
  const value = cookie.split(';')[0].slice('admin_session='.length);
  assert.equal(await isValidAdminSession(value), true);
  const out = await logout(new NextRequest('http://localhost/api/admin-logout', {
    method: 'POST', headers: { cookie: `admin_session=${value}`, origin: 'http://localhost' }
  }));
  assert.equal(out.status, 303);
  assert.match(out.headers.get('set-cookie')!, /Max-Age=0/i);
  // Stateless logout deletes the browser cookie; copied cookies remain valid.
  assert.equal(await isValidAdminSession(value), true);
  assert.equal((await proxy(new NextRequest('http://localhost/admin'))).status, 307);
  assert.equal((await proxy(new NextRequest('http://localhost/admin', { headers: { cookie: `admin_session=${value}` } }))).headers.get('x-middleware-next'), '1');
  assert.equal(getAdminCookieOptions().httpOnly, true);
});

test('failed login is rejected without issuing a session', async () => {
  credentials();
  const response = await login(loginRequest('wrong'));
  assert.equal(response.status, 303);
  assert.match(response.headers.get('location')!, /error=1/);
  assert.equal(response.headers.has('set-cookie'), false);
});

test('redirect allowlist rejects backslashes, encoded paths, relative URLs and normalization tricks', async () => {
  credentials();
  for (const path of ['//example.invalid', '/\\example.invalid', '/%5cexample.invalid',
    '/%2f%2fexample.invalid', '/%255cexample.invalid', '/admin/../settings',
    '/admin?next=//example.invalid', 'https://example.invalid', '\n/settings']) {
    assert.equal(getSafeRedirectPath(path), '/admin');
  }
  const response = await login(loginRequest(process.env.ADMIN_PASSWORD!, '/\\example.invalid'));
  assert.equal(response.headers.get('location'), 'http://localhost/admin');
});

test('session tampering, trailing segments and password rotation invalidate cookies', async () => {
  credentials();
  const session = (await createAdminSessionValue())!;
  assert.equal(await isValidAdminSession(session), true);
  assert.equal(await isValidAdminSession(session + '.extra'), false);
  assert.equal(await isValidAdminSession(session.slice(0, -1) + (session.endsWith('a') ? 'b' : 'a')), false);
  process.env.ADMIN_PASSWORD = randomBytes(24).toString('hex');
  assert.equal(await isValidAdminSession(session), false);
});

test('signed sessions tolerate a verifier clock slightly behind the issuing instance', async () => {
  credentials();
  const session = (await createAdminSessionValue())!;
  const verifierTime = Date.now() - 2000;
  mock.method(Date, 'now', () => verifierTime);
  assert.equal(await isValidAdminSession(session), true);
  const response = await logout(new NextRequest('http://localhost/api/admin-logout', {
    method: 'POST', headers: { cookie: `admin_session=${session}` }
  }));
  assert.equal(response.status, 303);
  assert.equal(await isValidAdminSession(session), true);
});

test('expired signed sessions remain invalid', async () => {
  credentials();
  const session = (await createAdminSessionValue())!;
  const afterExpiry = Number(session.split('.')[0]) + 1;
  mock.method(Date, 'now', () => afterExpiry);
  assert.equal(await isValidAdminSession(session), false);
});

test('unexpected internal configuration errors are not returned or logged verbatim', async () => {
  process.env.AI_PROVIDER = 'private-provider-detail';
  const logger = mock.method(console, 'error', () => {});
  const response = await chat(chatRequest('{"message":"sensitive message"}'));
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.doesNotMatch(body, /private-provider|AI_PROVIDER|detail|stack|sensitive/);
  assert.doesNotMatch(JSON.stringify(logger.mock.calls), /private-provider|AI_PROVIDER|sensitive/);
});

test('Ollama failures remain generic with a mocked upstream and no response logging', async () => {
  process.env.AI_PROVIDER = 'ollama';
  const logger = mock.method(console, 'error', () => {});
  const fullResponseLog = mock.method(console, 'log', () => {});
  mock.method(globalThis, 'fetch', async () => new Response('{"error":"sensitive model detail"}', { status: 500 }));
  const response = await chat(chatRequest('{"message":"sensitive inquiry"}'));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: '回答の取得に失敗しました。時間をおいて再度お試しください。', code: 'generationFailed'
  });
  assert.equal(fullResponseLog.mock.callCount(), 0);
  assert.doesNotMatch(JSON.stringify(logger.mock.calls), /sensitive|Ollama|model/);
});

test('Ollama defaults and bounded request contract are preserved using only a fetch mock', async () => {
  process.env.AI_PROVIDER = 'ollama';
  delete process.env.OLLAMA_MODEL;
  delete process.env.OLLAMA_API_BASE;
  delete process.env.OLLAMA_API_URL;
  assert.equal(getAiGenerationConfig().model, 'qwen2.5-coder:7b');
  const network = mock.method(globalThis, 'fetch', async (_url: unknown, options?: RequestInit) => {
    const body = JSON.parse(options!.body as string);
    assert.equal(body.options.num_predict, 512);
    assert.ok(options?.signal);
    return new Response(JSON.stringify({ message: { content: 'mock answer' } }));
  });
  const result = await generateAiAnswer('test', 500, assessCustomerHarassment('test'));
  assert.equal(result.answer, 'mock answer');
  assert.equal(network.mock.callCount(), 1);
});

test('representative regex limitations remain visible rather than claiming contextual understanding', () => {
  assert.equal(assessCustomerHarassment('返金の条件を確認したいです').level, 'none');
  // Current regex can flag legitimate legal-rights language (false positive).
  assert.equal(assessCustomerHarassment('法的権利として訴えることを検討します').level, 'low');
  // Spaced threat text can be missed (false negative).
  assert.equal(assessCustomerHarassment('こ ろ す').level, 'none');
});


test('Vercel production demo and signed sessions work without any shared store or fetch', async () => {
  const previous = process.env.NODE_ENV;
  const network = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network'); });
  try {
    Object.assign(process.env, { NODE_ENV: 'production', VERCEL: '1' });
    credentials();
    const response = await chat(chatRequest('{"message":"営業時間を教えてください。"}'));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).answer, aiProviderText.demo.normal);
    const signed = await createAdminSessionValue();
    assert.ok(signed);
    assert.equal(await isValidAdminSession(signed), true);
    assert.equal(getAdminCookieOptions().secure, true);
    assert.equal(network.mock.callCount(), 0);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Object.assign(process.env, { NODE_ENV: previous });
  }
});

test('Ollama API route still works without a shared store using only a mock', async () => {
  process.env.AI_PROVIDER = 'ollama';
  process.env.OLLAMA_API_BASE = 'http://ollama.invalid';
  const network = mock.method(globalThis, 'fetch', async (url: unknown) => {
    assert.equal(String(url), 'http://ollama.invalid/api/chat');
    return Response.json({ message: { content: 'mock answer' } });
  });
  const response = await chat(chatRequest('{"message":"営業時間を教えてください。"}'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).answer, 'mock answer');
  assert.equal(network.mock.callCount(), 1);
});
