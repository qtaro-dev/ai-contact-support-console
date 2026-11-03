// Optional real Redis test. Uses a disposable, port-unpublished Docker container
// through redis-cli and a loopback REST adapter; never connects to Ollama.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { RedisSecurityStore } from '@/lib/securityStore';

const container = process.env.REDIS_TEST_CONTAINER;
const run = promisify(execFile);
const token = randomUUID();
const server = createServer(async (request, response) => {
  if (request.headers.authorization !== `Bearer ${token}`) {
    response.writeHead(401).end();
    return;
  }
  try {
    let body = '';
    for await (const chunk of request) body += chunk;
    const args = JSON.parse(body) as (string | number)[];
    const { stdout } = await run('docker', ['exec', container!, 'redis-cli', '--json', ...args.map(String)]);
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ result: JSON.parse(stdout) }));
  } catch {
    response.writeHead(503).end();
  }
});
let a: RedisSecurityStore;
let b: RedisSecurityStore;
const prefix = randomUUID();

before(async () => {
  if (!container) return;
  if (!/^[a-zA-Z0-9_-]+$/.test(container)) throw new Error('Invalid test container name');
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  a = new RedisSecurityStore(url, token);
  b = new RedisSecurityStore(url, token);
});
after(async () => { if (server.listening) await new Promise<void>(resolve => server.close(() => resolve())); });

test('independent clients share one atomic rate quota', { skip: !container }, async () => {
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) =>
    (i % 2 ? a : b).consume(`${prefix}:rate`, 5, 10000)));
  assert.equal(results.filter(Boolean).length, 5);
});

test('independent clients share concurrent leases, release and expiry', { skip: !container }, async () => {
  const key = `${prefix}:active`;
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    (i % 2 ? a : b).acquire(key, 4, 10000)));
  const leases = results.filter(value => value !== null);
  assert.equal(leases.length, 4);
  await b.release(key, leases[0]);
  assert.ok(await a.acquire(key, 4, 10000));
  for (const lease of leases.slice(1)) await a.release(key, lease);
  const expiringKey = `${prefix}:expiring`;
  assert.ok(await a.acquire(expiringKey, 1, 100));
  await setTimeout(150);
  assert.ok(await b.acquire(expiringKey, 1, 100));
});

test('session revocation is visible to another client', { skip: !container }, async () => {
  const key = `${prefix}:session`;
  await a.put(key, 10000);
  assert.equal(await b.has(key), true);
  await b.remove(key);
  assert.equal(await a.has(key), false);
});
