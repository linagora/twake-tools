import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readToken, errorDetail, errorMessage, createClient, BASE_URL } from '../src/client.js';

test('readToken returns BENDER_TOKEN', () => {
  assert.equal(readToken({ BENDER_TOKEN: 'abc' }), 'abc');
});

test('readToken explains where to get a token when it is missing', () => {
  assert.throws(() => readToken({}), /Personal API token/);
});

test('errorDetail prefers the API error message', () => {
  assert.equal(errorDetail('{"error":"Instance not found"}'), 'Instance not found');
  assert.equal(errorDetail('{"errors":[{"detail":"bad slug"}]}'), 'bad slug');
  assert.equal(errorDetail('{"errors":[{"title":"Conflict"}]}'), 'Conflict');
  assert.equal(errorDetail('{"message":"nope"}'), 'nope');
});

test('errorDetail describes an empty body', () => {
  assert.equal(errorDetail('   '), 'no response body');
});

test('errorDetail flags an HTML body without dumping it', () => {
  const detail = errorDetail('<!doctype html><html><body>login</body></html>');
  assert.match(detail, /unexpected HTML response/);
  assert.doesNotMatch(detail, /doctype/);
});

test('errorDetail truncates an unparseable body to one short line', () => {
  const detail = errorDetail('boom\n'.repeat(200));
  assert.ok(detail.length <= 160);
  assert.doesNotMatch(detail, /\n/);
});

test('errorMessage names an auth failure for 401, 403 and redirects', () => {
  for (const status of [401, 403, 302]) {
    assert.match(errorMessage({ status, rawBody: '' }), /authentication failed/);
  }
});

test('errorMessage names an unreachable Bender for status 0', () => {
  assert.match(errorMessage({ status: 0, rawBody: '' }), /could not reach Bender/);
});

test('errorMessage reports other failures with status and detail', () => {
  assert.equal(
    errorMessage({ status: 404, rawBody: '{"error":"Instance not found"}' }),
    'HTTP 404, Instance not found'
  );
});

test('request sends the token, the path and the JSON body', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response('{"data":{"attributes":{"version":"1.2.3"}}}', { status: 200 });
  };
  const client = createClient({ token: 'tok', fetchImpl });

  const res = await client.request('PUT', '/instances/prod/a.cozy/features', { name: 'f' });

  assert.equal(calls[0].url, `${BASE_URL}/instances/prod/a.cozy/features`);
  assert.equal(calls[0].init.method, 'PUT');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer tok');
  assert.equal(calls[0].init.body, '{"name":"f"}');
  assert.equal(res.ok, true);
  assert.equal(res.data.data.attributes.version, '1.2.3');
  assert.equal(res.error, null);
});

test('request omits the body for a GET', async () => {
  let init;
  const fetchImpl = async (_url, i) => {
    init = i;
    return new Response('{}', { status: 200 });
  };
  await createClient({ token: 't', fetchImpl }).request('GET', '/x');
  assert.equal(init.body, undefined);
});

test('request reports a non-2xx response instead of throwing', async () => {
  const fetchImpl = async () => new Response('{"error":"Instance not found"}', { status: 404 });
  const res = await createClient({ token: 't', fetchImpl }).request('GET', '/x');
  assert.equal(res.ok, false);
  assert.equal(res.status, 404);
  assert.equal(res.error, 'HTTP 404, Instance not found');
});

test('request reports a network failure as status 0', async () => {
  const fetchImpl = async () => {
    throw new TypeError('fetch failed');
  };
  const res = await createClient({ token: 't', fetchImpl }).request('GET', '/x');
  assert.equal(res.ok, false);
  assert.equal(res.status, 0);
  assert.match(res.error, /could not reach Bender/);
});

test('request logs the raw body when verbose', async () => {
  const logged = [];
  const fetchImpl = async () => new Response('{"a":1}', { status: 200 });
  await createClient({ token: 't', fetchImpl, verbose: true, log: (l) => logged.push(l) })
    .request('GET', '/x');
  assert.match(logged.join('\n'), /\{"a":1\}/);
});

test('request resolves with status 0 for a non-serializable body instead of rejecting', async () => {
  const fetchImpl = async () => new Response('{}', { status: 200 });
  const circular = {};
  circular.self = circular;
  const res = await createClient({ token: 't', fetchImpl }).request('POST', '/x', circular);
  assert.equal(res.ok, false);
  assert.equal(res.status, 0);
  assert.match(res.error, /could not reach Bender/);
});

test('request logs the network error text when verbose', async () => {
  const logged = [];
  const fetchImpl = async () => {
    throw new TypeError('fetch failed');
  };
  await createClient({ token: 't', fetchImpl, verbose: true, log: (l) => logged.push(l) })
    .request('GET', '/x');
  assert.match(logged.join('\n'), /fetch failed/);
});

test('request treats a login-page redirect as an auth failure, not a success', async () => {
  // With the default `redirect: "follow"`, fetch would silently swallow this
  // 302 and hand back a 200 from the login page — this pins `redirect: "manual"`.
  const fetchImpl = async () => new Response('', { status: 302 });
  const res = await createClient({ token: 't', fetchImpl }).request('GET', '/x');
  assert.equal(res.ok, false);
  assert.equal(res.status, 302);
  assert.match(res.error, /authentication failed/);
});

test('request resets status to 0 if reading the response body fails', async () => {
  // A minimal fake response: status resolves but reading the body throws,
  // so status must not be left standing as a false "success".
  const fetchImpl = async () => ({
    status: 200,
    text: async () => {
      throw new Error('stream error');
    },
  });
  const res = await createClient({ token: 't', fetchImpl }).request('GET', '/x');
  assert.equal(res.ok, false);
  assert.equal(res.status, 0);
});
