# cozy-bender Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-purpose `cozy-app-bender-updater` bash script with `cozy-bender`, a dependency-free Node CLI that deploys apps *and* sets feature flags on Cozy instances through the Bender API.

**Architecture:** One tool with sub-commands. `src/client.js` owns HTTP, the token and Bender's error shapes; `src/output.js` owns formatting; `src/apps.js` and `src/flags.js` hold only domain logic; `src/cli.js` dispatches. Adding a future Bender endpoint means adding one `src/<domain>.js` plus a dispatch entry.

**Tech Stack:** Node 24 (native `fetch`, `node:test`), zero npm dependencies.

**Spec:** `docs/superpowers/specs/2026-07-29-cozy-bender-design.md`

## Global Constraints

- Zero npm dependencies. Node built-ins only (`node:test`, `node:assert/strict`, global `fetch`). No `jq`.
- `engines.node` is `>=24`. ESM only (`"type": "module"`).
- Bender base URL: `https://bender.cozycloud.cc`. Auth header: `Authorization: Bearer <token>`, token read from `BENDER_TOKEN` only — never hardcoded, never committed.
- Argument order is `<env>` first, then `<instances>`, in every sub-command.
- Feature flags use `source: "instance"` only. `defaults`, `ratio` and `context` are out of scope.
- No backwards compatibility with `cozy-app-bender-updater`: no alias, no legacy-argument-order detection.
- Git commit message titles must not exceed 72 characters.
- Every network call goes through `src/client.js`. Tests never hit the real Bender — they inject a substitute `fetch`.
- Comments explain *why*, not *what*, and are written in English like the rest of the codebase.

---

### Task 1: Determine how Bender encodes feature flag values

The OpenAPI spec declares `value` as `type: string` with example `"true"`, while
describing it as "Value of the flag in JSON". So the request body is either
`{"value": "true"}` (JSON serialised into a string) or `{"value": true}` (native
JSON). Every later task depends on the answer. **This task is an experiment, not
code** — it must be run against a real dev instance before `src/flags.js` is written.

**Files:**
- Modify: `docs/superpowers/specs/2026-07-29-cozy-bender-design.md` (record the answer)

**Interfaces:**
- Consumes: nothing
- Produces: the value of `ENCODING`, either `"string"` or `"native"`. Task 6 branches on it.

- [ ] **Step 1: Get a dev target from the user**

Ask the user for a throwaway dev instance domain and its Bender environment name,
and confirm `BENDER_TOKEN` is exported. Do not guess a domain — writing a flag
mutates a real instance.

- [ ] **Step 2: Probe with the string encoding**

```bash
ENV=<env>; DOMAIN=<domain>
curl -sS -X PUT "https://bender.cozycloud.cc/instances/$ENV/$DOMAIN/features" \
  -H "Authorization: Bearer $BENDER_TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"name":"cozy-bender.probe","value":"true","source":"instance"}' -w '\nHTTP %{http_code}\n'
curl -sS "https://bender.cozycloud.cc/instances/$ENV/$DOMAIN/features" \
  -H "Authorization: Bearer $BENDER_TOKEN" -H "Accept: application/json" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const f=JSON.parse(s).features;console.log(JSON.stringify(f["cozy-bender.probe"]))})'
```

Expected if the string encoding is right: the read-back prints `true` (a boolean).
If it prints `"true"` (a quoted string) the API stored the raw string — that means
the native encoding is the correct one.

- [ ] **Step 3: Probe with the native encoding**

```bash
curl -sS -X PUT "https://bender.cozycloud.cc/instances/$ENV/$DOMAIN/features" \
  -H "Authorization: Bearer $BENDER_TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"name":"cozy-bender.probe","value":true,"source":"instance"}' -w '\nHTTP %{http_code}\n'
```

Then read back with the same command as Step 2. Whichever of the two probes stores
a real boolean is the encoding to use. If both do, prefer the native encoding
(`{"value": true}`) — it round-trips objects and arrays without double-encoding.

- [ ] **Step 4: Verify deletion, using the encoding chosen above**

```bash
# string encoding -> '{"name":"cozy-bender.probe","value":"null","source":"instance"}'
# native encoding -> '{"name":"cozy-bender.probe","value":null,"source":"instance"}'
curl -sS -X PUT "https://bender.cozycloud.cc/instances/$ENV/$DOMAIN/features" \
  -H "Authorization: Bearer $BENDER_TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '<body from the line above>' -w '\nHTTP %{http_code}\n'
```

Then read back: `cozy-bender.probe` must be absent (the node one-liner prints
`undefined`). If deletion does not work with the chosen encoding, record that too —
Task 6 will need a special case for `null`.

- [ ] **Step 5: Record the answer in the spec**

Replace the "Ambiguïté à lever avant d'implémenter" section of the spec with the
observed result: which encoding stores values correctly, whether `null` deletes,
and the exact request bodies used. Keep it short — three or four lines.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-07-29-cozy-bender-design.md
git commit -m "docs(cozy-bender): Record Bender feature value encoding"
```

---

### Task 2: Scaffold the tool and its command dispatch

Creates the new tool, removes the old one, and gets `cozy-bender` printing usage.
No Bender calls yet.

**Files:**
- Create: `cozy-bender/package.json`
- Create: `cozy-bender/bin/cozy-bender.js`
- Create: `cozy-bender/src/cli.js`
- Test: `cozy-bender/test/cli.test.js`
- Delete: `cozy-app-bender-updater/` (whole directory)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `USAGE: string` — the usage text, exported from `src/cli.js`
  - `async function main(argv: string[], deps?: object): Promise<number>` — returns the process exit code; `deps` is forwarded untouched to sub-command handlers so tests can inject a substitute `fetch`.

- [ ] **Step 1: Write the failing test**

Create `cozy-bender/test/cli.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main, USAGE } from '../src/cli.js';

test('lists every sub-command in the usage text', () => {
  assert.match(USAGE, /cozy-bender apps update <env> <instances>/);
  assert.match(USAGE, /cozy-bender flags set {3}<env> <instances>/);
  assert.match(USAGE, /cozy-bender flags list {2}<env> <instance>/);
});

test('exits 1 with usage when no sub-command is given', async () => {
  const lines = [];
  const code = await main([], { log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /cozy-bender apps update/);
});

test('exits 1 on an unknown sub-command', async () => {
  const lines = [];
  const code = await main(['wat'], { log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Unknown command: wat/);
});

test('exits 1 on a known group with an unknown action', async () => {
  const lines = [];
  const code = await main(['flags', 'wat'], { log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Unknown command: flags wat/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd cozy-bender && node --test`
Expected: FAIL — `Cannot find module '../src/cli.js'`

- [ ] **Step 3: Write the package manifest**

Create `cozy-bender/package.json`:

```json
{
  "name": "cozy-bender",
  "version": "2.0.0",
  "description": "CLI tool to drive the Bender API: deploy apps and set feature flags on Cozy instances",
  "type": "module",
  "bin": {
    "cozy-bender": "./bin/cozy-bender.js"
  },
  "scripts": {
    "test": "node --test"
  },
  "keywords": [
    "cozy",
    "bender",
    "instance",
    "feature-flags"
  ],
  "author": "Twake",
  "license": "MIT",
  "engines": {
    "node": ">=24"
  }
}
```

- [ ] **Step 4: Write the dispatcher**

Create `cozy-bender/src/cli.js`:

```js
export const USAGE = `Usage: cozy-bender <command> [args...]

  cozy-bender apps update <env> <instances> <slug> <org/repo> [branch] [force]
  cozy-bender flags set   <env> <instances> <flag=value>...
  cozy-bender flags list  <env> <instance>

<instances> is one or more instance domains separated by commas.

Requires a Bender personal API token in BENDER_TOKEN. Get one from
https://bender.cozycloud.cc/ -> Profile -> "Personal API token".`;

// Handlers are looked up by "<group> <action>" so that adding a Bender endpoint
// is one entry here plus one module under src/.
const COMMANDS = {};

export async function main(argv, deps = {}) {
  const log = deps.log ?? console.log;
  const key = argv.slice(0, 2).join(' ');
  const handler = COMMANDS[key];

  if (!handler) {
    if (argv.length > 0) log(`Unknown command: ${argv.slice(0, 2).join(' ')}`);
    log(USAGE);
    return 1;
  }

  return handler(argv.slice(2), deps);
}
```

- [ ] **Step 5: Write the entry point**

Create `cozy-bender/bin/cozy-bender.js`:

```js
#!/usr/bin/env node

import { main } from '../src/cli.js';

process.exit(await main(process.argv.slice(2)));
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd cozy-bender && node --test`
Expected: PASS, 4 tests

- [ ] **Step 7: Check the entry point end to end**

Run: `cd cozy-bender && node bin/cozy-bender.js; echo "exit=$?"`
Expected: the usage text, then `exit=1`

- [ ] **Step 8: Remove the old tool**

```bash
git rm -r cozy-app-bender-updater
```

- [ ] **Step 9: Verify the dispatcher sees the new tool**

Run: `node bin/twake-tools.js` from the repository root.
Expected: the tool list contains `cozy-bender` and no longer contains
`cozy-app-bender-updater`. No change to `bin/twake-tools.js` is needed — it
discovers tools by looking for `<dir>/bin/<dir>.js`.

- [ ] **Step 10: Commit**

```bash
git add cozy-bender
git commit -m "feat(cozy-bender): Scaffold tool, replacing bender updater"
```

---

### Task 3: Output formatting

Pure formatting helpers, no I/O. Extracted first so both `apps` and `flags` share
one visual language.

**Files:**
- Create: `cozy-bender/src/output.js`
- Test: `cozy-bender/test/output.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `styles(enabled: boolean): {bold, dim, green, red, reset}` — ANSI codes, or empty strings when `enabled` is false
  - `ok(text: string, s?: styles): string` — a `✔` line
  - `fail(text: string, s?: styles): string` — a `✘` line
  - `summaryLine({total: number, failures: string[], label: string}, s?: styles): string`

- [ ] **Step 1: Write the failing test**

Create `cozy-bender/test/output.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { styles, ok, fail, summaryLine } from '../src/output.js';

test('styles are empty when colour is disabled', () => {
  assert.deepEqual(styles(false), { bold: '', dim: '', green: '', red: '', reset: '' });
});

test('styles are ANSI codes when colour is enabled', () => {
  assert.equal(styles(true).green, '\x1b[32m');
});

test('ok and fail mark their line', () => {
  assert.equal(ok('done'), '✔ done');
  assert.equal(fail('nope'), '✘ nope');
});

test('summary reports every operation succeeding', () => {
  assert.equal(
    summaryLine({ total: 3, failures: [], label: 'instance(s) updated' }),
    '3/3 instance(s) updated'
  );
});

test('summary lists the failures', () => {
  assert.equal(
    summaryLine({ total: 3, failures: ['a.cozy', 'b.cozy'], label: 'instance(s) updated' }),
    '1/3 instance(s) updated — failed: a.cozy, b.cozy'
  );
});

test('summary colours the count red when something failed', () => {
  const line = summaryLine({ total: 2, failures: ['a.cozy'], label: 'x' }, styles(true));
  assert.match(line, /^\x1b\[31m\x1b\[1m1\/2 x\x1b\[0m/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd cozy-bender && node --test test/output.test.js`
Expected: FAIL — `Cannot find module '../src/output.js'`

- [ ] **Step 3: Write the implementation**

Create `cozy-bender/src/output.js`:

```js
const ANSI = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

const PLAIN = { bold: '', dim: '', green: '', red: '', reset: '' };

export function styles(enabled) {
  return enabled ? { ...ANSI } : { ...PLAIN };
}

export function ok(text, s = PLAIN) {
  return `${s.green}✔${s.reset} ${text}`;
}

export function fail(text, s = PLAIN) {
  return `${s.red}✘${s.reset} ${text}`;
}

export function summaryLine({ total, failures, label }, s = PLAIN) {
  const head = `${total - failures.length}/${total} ${label}`;
  const colour = failures.length ? s.red : s.green;
  const line = `${colour}${s.bold}${head}${s.reset}`;
  return failures.length ? `${line} — failed: ${failures.join(', ')}` : line;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd cozy-bender && node --test test/output.test.js`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add cozy-bender/src/output.js cozy-bender/test/output.test.js
git commit -m "feat(cozy-bender): Add output formatting helpers"
```

---

### Task 4: HTTP client and error taxonomy

**Files:**
- Create: `cozy-bender/src/client.js`
- Test: `cozy-bender/test/client.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `BASE_URL: string`
  - `readToken(env?: object): string` — throws `Error` with a help message when `BENDER_TOKEN` is unset
  - `errorDetail(rawBody: string): string`
  - `errorMessage({status: number, rawBody: string}): string`
  - `createClient({token, fetchImpl?, baseUrl?, verbose?, log?}): {request(method, path, body?): Promise<{ok: boolean, status: number, data: object|null, rawBody: string, error: string|null}>}` — `status` is `0` when the request could not be sent; `request` never throws on HTTP or network failure.

- [ ] **Step 1: Write the failing test**

Create `cozy-bender/test/client.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd cozy-bender && node --test test/client.test.js`
Expected: FAIL — `Cannot find module '../src/client.js'`

- [ ] **Step 3: Write the implementation**

Create `cozy-bender/src/client.js`:

```js
export const BASE_URL = 'https://bender.cozycloud.cc';

const TOKEN_HELP = `No Bender token provided.
Get one from https://bender.cozycloud.cc/ -> Profile -> "Personal API token",
then run: export BENDER_TOKEN="<your-token>"`;

export function readToken(env = process.env) {
  const token = env.BENDER_TOKEN;
  if (!token) throw new Error(TOKEN_HELP);
  return token;
}

// Bender reports errors in several shapes depending on the endpoint, so try each
// known one before falling back to a short excerpt of the raw body.
export function errorDetail(rawBody) {
  try {
    const body = JSON.parse(rawBody);
    const detail =
      body?.error ?? body?.errors?.[0]?.detail ?? body?.errors?.[0]?.title ?? body?.message;
    if (detail) return String(detail);
  } catch {
    // Not JSON — fall through to the raw-body fallbacks.
  }

  const trimmed = rawBody.trim();
  if (!trimmed) return 'no response body';
  if (trimmed.startsWith('<')) {
    return 'unexpected HTML response (run again with BENDER_VERBOSE=1 to see it)';
  }
  return trimmed.replace(/\s+/g, ' ').slice(0, 160);
}

export function errorMessage({ status, rawBody }) {
  if (status === 0) return 'request failed (could not reach Bender)';
  // A redirect means Bender bounced us to the login page rather than answering.
  if (status === 401 || status === 403 || (status >= 300 && status < 400)) {
    return `authentication failed (HTTP ${status}) — check your Bender token`;
  }
  return `HTTP ${status}, ${errorDetail(rawBody)}`;
}

export function createClient({
  token,
  fetchImpl = fetch,
  baseUrl = BASE_URL,
  verbose = false,
  log = console.log,
} = {}) {
  async function request(method, path, body) {
    const init = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    let status = 0;
    let rawBody = '';
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, init);
      status = response.status;
      rawBody = await response.text();
    } catch {
      // Keep status 0 so callers get one uniform "could not reach Bender" error.
    }

    if (verbose) log(rawBody);

    let data = null;
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Leave data null; error reporting works off rawBody.
    }

    const ok = status >= 200 && status < 300;
    return { ok, status, data, rawBody, error: ok ? null : errorMessage({ status, rawBody }) };
  }

  return { request };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd cozy-bender && node --test test/client.test.js`
Expected: PASS, 14 tests

- [ ] **Step 5: Commit**

```bash
git add cozy-bender/src/client.js cozy-bender/test/client.test.js
git commit -m "feat(cozy-bender): Add HTTP client and error taxonomy"
```

---

### Task 5: `apps update`

Ports `update-app-bender.sh` to Node and wires it into the dispatcher.

**Files:**
- Create: `cozy-bender/src/apps.js`
- Modify: `cozy-bender/src/cli.js` (register the handler)
- Test: `cozy-bender/test/apps.test.js`
- Test: `cozy-bender/test/cli.test.js` (dispatch assertion)

**Interfaces:**
- Consumes: `createClient`, `readToken`, `errorMessage` from `src/client.js`; `styles`, `ok`, `fail`, `summaryLine` from `src/output.js`
- Produces:
  - `parseAppsUpdateArgs(args: string[]): {env, instances: string[], slug, repo, branch, force: boolean}` — throws `Error` on bad usage
  - `buildSource({repo, branch}): string`
  - `buildAppUpdate({env, instance, slug, repo, branch, force}): {path: string, body: object}`
  - `async function appsUpdate(args: string[], deps?: object): Promise<number>`

- [ ] **Step 1: Write the failing test**

Create `cozy-bender/test/apps.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAppsUpdateArgs, buildSource, buildAppUpdate, appsUpdate } from '../src/apps.js';

test('parses the full argument list', () => {
  const parsed = parseAppsUpdateArgs(['prod', 'a.cozy,b.cozy', 'home', 'cozy/cozy-home', 'dev', 'false']);
  assert.deepEqual(parsed, {
    env: 'prod',
    instances: ['a.cozy', 'b.cozy'],
    slug: 'home',
    repo: 'cozy/cozy-home',
    branch: 'dev',
    force: false,
  });
});

test('defaults branch to build and force to true', () => {
  const parsed = parseAppsUpdateArgs(['prod', 'a.cozy', 'home', 'cozy/cozy-home']);
  assert.equal(parsed.branch, 'build');
  assert.equal(parsed.force, true);
});

test('rejects a missing argument', () => {
  assert.throws(() => parseAppsUpdateArgs(['prod', 'a.cozy', 'home']), /Usage/);
});

test('rejects a repo without an organisation', () => {
  assert.throws(
    () => parseAppsUpdateArgs(['prod', 'a.cozy', 'home', 'cozy-home']),
    /must include the organization/
  );
});

test('rejects a force value that is not true or false', () => {
  assert.throws(
    () => parseAppsUpdateArgs(['prod', 'a.cozy', 'home', 'cozy/cozy-home', 'build', 'yes']),
    /force must be/
  );
});

test('drops empty entries from the instance list', () => {
  assert.deepEqual(
    parseAppsUpdateArgs(['prod', 'a.cozy,,b.cozy,', 'home', 'cozy/cozy-home']).instances,
    ['a.cozy', 'b.cozy']
  );
});

test('builds the git source from repo and branch', () => {
  assert.equal(
    buildSource({ repo: 'cozy/cozy-home', branch: 'build' }),
    'git://github.com/cozy/cozy-home.git#build'
  );
});

test('builds the request path and body', () => {
  assert.deepEqual(
    buildAppUpdate({
      env: 'prod',
      instance: 'a.cozy',
      slug: 'home',
      repo: 'cozy/cozy-home',
      branch: 'build',
      force: true,
    }),
    {
      path: '/instances/prod/a.cozy/apps/home',
      body: { force: true, source: 'git://github.com/cozy/cozy-home.git#build' },
    }
  );
});

test('updates every instance and reports success', async () => {
  const paths = [];
  const fetchImpl = async (url) => {
    paths.push(new URL(url).pathname);
    return new Response('{"data":{"attributes":{"version":"1.2.3","state":"ready"}}}', { status: 200 });
  };
  const lines = [];
  const code = await appsUpdate(['prod', 'a.cozy,b.cozy', 'home', 'cozy/cozy-home'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 0);
  assert.deepEqual(paths, ['/instances/prod/a.cozy/apps/home', '/instances/prod/b.cozy/apps/home']);
  const out = lines.join('\n');
  assert.match(out, /✔ a\.cozy: updated \(version 1\.2\.3, state ready\)/);
  assert.match(out, /2\/2 instance\(s\) updated/);
});

test('keeps going after a failure and exits 1', async () => {
  const fetchImpl = async (url) =>
    url.includes('a.cozy')
      ? new Response('{"error":"Instance not found"}', { status: 404 })
      : new Response('{}', { status: 200 });
  const lines = [];
  const code = await appsUpdate(['prod', 'a.cozy,b.cozy', 'home', 'cozy/cozy-home'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  const out = lines.join('\n');
  assert.match(out, /✘ a\.cozy: HTTP 404, Instance not found/);
  assert.match(out, /✔ b\.cozy: updated/);
  assert.match(out, /1\/2 instance\(s\) updated — failed: a\.cozy/);
});

test('exits 1 with usage on bad arguments, without calling Bender', async () => {
  let called = false;
  const lines = [];
  const code = await appsUpdate(['prod'], {
    fetchImpl: async () => {
      called = true;
      return new Response('{}', { status: 200 });
    },
    token: 'tok',
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  assert.equal(called, false);
  assert.match(lines.join('\n'), /Usage/);
});
```

Append to `cozy-bender/test/cli.test.js`:

```js
test('routes "apps update" to the apps handler', async () => {
  const lines = [];
  const code = await main(['apps', 'update', 'prod'], { log: (l) => lines.push(l), token: 'tok' });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Usage: cozy-bender apps update/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd cozy-bender && node --test`
Expected: FAIL — `Cannot find module '../src/apps.js'`

- [ ] **Step 3: Write the implementation**

Create `cozy-bender/src/apps.js`:

```js
import { createClient, readToken } from './client.js';
import { fail, ok, styles, summaryLine } from './output.js';

const USAGE = `Usage: cozy-bender apps update <env> <instances> <slug> <org/repo> [branch] [force]
Example: cozy-bender apps update prod a.mycozy.cloud,b.mycozy.cloud home cozy/cozy-home build false`;

export function parseAppsUpdateArgs(args) {
  const [env, instanceList, slug, repo, branch = 'build', force = 'true'] = args;

  if (!env || !instanceList || !slug || !repo) throw new Error(USAGE);
  if (!repo.includes('/')) {
    throw new Error(
      `repo must include the organization, e.g. "cozy/cozy-home" (got "${repo}")`
    );
  }
  if (force !== 'true' && force !== 'false') {
    throw new Error(`force must be "true" or "false" (got "${force}")`);
  }

  const instances = instanceList.split(',').filter(Boolean);
  if (instances.length === 0) throw new Error(USAGE);

  return { env, instances, slug, repo, branch, force: force === 'true' };
}

export function buildSource({ repo, branch }) {
  return `git://github.com/${repo}.git#${branch}`;
}

export function buildAppUpdate({ env, instance, slug, repo, branch, force }) {
  return {
    path: `/instances/${env}/${instance}/apps/${slug}`,
    body: { force, source: buildSource({ repo, branch }) },
  };
}

export async function appsUpdate(args, deps = {}) {
  const log = deps.log ?? console.log;
  const s = styles(deps.isTTY ?? process.stdout.isTTY ?? false);

  let parsed;
  let token;
  try {
    parsed = parseAppsUpdateArgs(args);
    token = deps.token ?? readToken();
  } catch (error) {
    log(error.message);
    return 1;
  }

  const { env, instances, slug, repo, branch, force } = parsed;
  const client = createClient({
    token,
    fetchImpl: deps.fetchImpl,
    verbose: deps.verbose ?? process.env.BENDER_VERBOSE === '1',
    log,
  });
  const source = buildSource({ repo, branch });

  log(`${s.bold}Updating ${slug}${s.reset} from ${source} ${s.dim}(env: ${env}, force: ${force})${s.reset}`);
  log('');

  const failures = [];
  for (const instance of instances) {
    const { path, body } = buildAppUpdate({ env, instance, slug, repo, branch, force });
    const res = await client.request('PUT', path, body);

    if (!res.ok) {
      failures.push(instance);
      log(fail(`${instance}: ${res.error}`, s));
      continue;
    }

    const { version, state } = res.data?.data?.attributes ?? {};
    const details = [version && `version ${version}`, state && `state ${state}`]
      .filter(Boolean)
      .join(', ');
    log(ok(`${instance}: updated${details ? ` ${s.dim}(${details})${s.reset}` : ''}`, s));
  }

  log('');
  log(summaryLine({ total: instances.length, failures, label: 'instance(s) updated' }, s));
  return failures.length ? 1 : 0;
}
```

- [ ] **Step 4: Register the handler**

In `cozy-bender/src/cli.js`, add the import at the top and the dispatch entry:

```js
import { appsUpdate } from './apps.js';

const COMMANDS = {
  'apps update': appsUpdate,
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd cozy-bender && node --test`
Expected: PASS — all `apps`, `cli`, `client` and `output` tests

- [ ] **Step 6: Commit**

```bash
git add cozy-bender/src cozy-bender/test
git commit -m "feat(cozy-bender): Port app update to the new CLI"
```

---

### Task 6: `flags set`

**Files:**
- Create: `cozy-bender/src/flags.js`
- Modify: `cozy-bender/src/cli.js` (register the handler)
- Test: `cozy-bender/test/flags.test.js`

**Interfaces:**
- Consumes: `createClient`, `readToken` from `src/client.js`; `styles`, `ok`, `fail`, `summaryLine` from `src/output.js`
- Produces:
  - `parseFlagArg(arg: string): {name: string, value: unknown}` — throws on a missing `=`
  - `parseFlagArgs(args: string[]): Array<{name, value}>`
  - `encodeFlagValue(value: unknown): unknown`
  - `buildFlagSet({env, instance, name, value}): {path: string, body: object}`
  - `async function flagsSet(args: string[], deps?: object): Promise<number>`

- [ ] **Step 1: Write the failing test**

Create `cozy-bender/test/flags.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlagArg, parseFlagArgs, buildFlagSet, flagsSet } from '../src/flags.js';

test('parses JSON values', () => {
  assert.deepEqual(parseFlagArg('a.flag=true'), { name: 'a.flag', value: true });
  assert.deepEqual(parseFlagArg('a.flag=100'), { name: 'a.flag', value: 100 });
  assert.deepEqual(parseFlagArg('a.flag=[1,2]'), { name: 'a.flag', value: [1, 2] });
  assert.deepEqual(parseFlagArg('a.flag=null'), { name: 'a.flag', value: null });
});

test('falls back to a raw string when the value is not JSON', () => {
  assert.deepEqual(parseFlagArg('a.flag=dark'), { name: 'a.flag', value: 'dark' });
});

test('accepts an explicitly quoted string', () => {
  assert.deepEqual(parseFlagArg('a.flag="dark"'), { name: 'a.flag', value: 'dark' });
});

test('splits on the first = so values may contain more', () => {
  assert.deepEqual(parseFlagArg('a.flag=x=y'), { name: 'a.flag', value: 'x=y' });
});

test('an empty value is the empty string', () => {
  assert.deepEqual(parseFlagArg('a.flag='), { name: 'a.flag', value: '' });
});

test('rejects an argument without =', () => {
  assert.throws(() => parseFlagArg('a.flag'), /expected name=value/);
});

test('rejects an empty flag name', () => {
  assert.throws(() => parseFlagArg('=true'), /flag name/);
});

test('parseFlagArgs rejects an empty list', () => {
  assert.throws(() => parseFlagArgs([]), /at least one/);
});

test('builds the request path and body', () => {
  const { path, body } = buildFlagSet({
    env: 'prod',
    instance: 'a.cozy',
    name: 'a.flag',
    value: true,
  });
  assert.equal(path, '/instances/prod/a.cozy/features');
  assert.equal(body.name, 'a.flag');
  assert.equal(body.source, 'instance');
});

test('sets every flag on every instance', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ path: new URL(url).pathname, body: JSON.parse(init.body) });
    return new Response('{}', { status: 200 });
  };
  const lines = [];
  const code = await flagsSet(['prod', 'a.cozy,b.cozy', 'x.flag=true', 'y.flag=dark'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 0);
  assert.equal(calls.length, 4);
  assert.deepEqual(
    calls.map((c) => `${c.path} ${c.body.name}`),
    [
      '/instances/prod/a.cozy/features x.flag',
      '/instances/prod/a.cozy/features y.flag',
      '/instances/prod/b.cozy/features x.flag',
      '/instances/prod/b.cozy/features y.flag',
    ]
  );
  const out = lines.join('\n');
  assert.match(out, /Setting 2 flag\(s\) on 2 instance\(s\) \(env: prod\)/);
  assert.match(out, /✔ x\.flag = true/);
  assert.match(out, /✔ y\.flag = "dark"/);
  assert.match(out, /4\/4 flag update\(s\) applied/);
});

test('names the instance and the flag of each failure', async () => {
  const fetchImpl = async (url, init) =>
    JSON.parse(init.body).name === 'y.flag'
      ? new Response('{"error":"unknown flag"}', { status: 400 })
      : new Response('{}', { status: 200 });
  const lines = [];
  const code = await flagsSet(['prod', 'a.cozy', 'x.flag=true', 'y.flag=1'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  const out = lines.join('\n');
  assert.match(out, /✘ y\.flag — HTTP 400, unknown flag/);
  assert.match(out, /1\/2 flag update\(s\) applied — failed: a\.cozy \(y\.flag\)/);
});

test('rejects a malformed pair before calling Bender', async () => {
  let called = false;
  const lines = [];
  const code = await flagsSet(['prod', 'a.cozy', 'x.flag=true', 'oops'], {
    fetchImpl: async () => {
      called = true;
      return new Response('{}', { status: 200 });
    },
    token: 'tok',
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  assert.equal(called, false);
  assert.match(lines.join('\n'), /expected name=value/);
});

test('exits 1 with usage when arguments are missing', async () => {
  const lines = [];
  const code = await flagsSet(['prod'], { token: 'tok', log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Usage: cozy-bender flags set/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd cozy-bender && node --test test/flags.test.js`
Expected: FAIL — `Cannot find module '../src/flags.js'`

- [ ] **Step 3: Write the implementation**

Create `cozy-bender/src/flags.js`. **`encodeFlagValue` has two possible bodies —
use the one Task 1 established, delete the other, and keep the comment that
records why:**

```js
import { createClient, readToken } from './client.js';
import { fail, ok, styles, summaryLine } from './output.js';

const USAGE = `Usage: cozy-bender flags set <env> <instances> <flag=value>...
Example: cozy-bender flags set prod a.mycozy.cloud,b.mycozy.cloud banks.show-transfers=true home.theme=dark

Values are parsed as JSON, falling back to a raw string when that fails:
  a.flag=true    -> boolean true      a.flag=dark  -> string "dark"
  a.flag=100     -> number 100        a.flag=[1,2] -> array
  a.flag=null    -> deletes the flag  a.flag='"null"' -> string "null"`;

// Values reach us as shell words, so JSON first and raw string as a fallback:
// that keeps `theme=dark` working without shell-quoting gymnastics.
export function parseFlagArg(arg) {
  const separator = arg.indexOf('=');
  if (separator === -1) throw new Error(`Invalid flag "${arg}" — expected name=value`);

  const name = arg.slice(0, separator);
  if (!name) throw new Error(`Invalid flag "${arg}" — flag name must not be empty`);

  const raw = arg.slice(separator + 1);
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    value = raw;
  }
  return { name, value };
}

export function parseFlagArgs(args) {
  if (args.length === 0) throw new Error('Provide at least one flag as name=value');
  return args.map(parseFlagArg);
}

// TASK 1 DECIDES THIS — keep exactly one of the two bodies below.
//
// Variant "native" (preferred when both work): Bender stores the JSON value as-is.
export function encodeFlagValue(value) {
  return value;
}
//
// Variant "string": the API's `value` field is a JSON document inside a string.
// export function encodeFlagValue(value) {
//   return JSON.stringify(value);
// }

export function buildFlagSet({ env, instance, name, value }) {
  return {
    path: `/instances/${env}/${instance}/features`,
    body: { name, value: encodeFlagValue(value), source: 'instance' },
  };
}

export async function flagsSet(args, deps = {}) {
  const log = deps.log ?? console.log;
  const s = styles(deps.isTTY ?? process.stdout.isTTY ?? false);

  const [env, instanceList, ...flagArgs] = args;
  let flags;
  let instances;
  let token;
  try {
    if (!env || !instanceList) throw new Error(USAGE);
    instances = instanceList.split(',').filter(Boolean);
    if (instances.length === 0) throw new Error(USAGE);
    flags = parseFlagArgs(flagArgs);
    token = deps.token ?? readToken();
  } catch (error) {
    log(error.message);
    return 1;
  }

  const client = createClient({
    token,
    fetchImpl: deps.fetchImpl,
    verbose: deps.verbose ?? process.env.BENDER_VERBOSE === '1',
    log,
  });

  log(
    `${s.bold}Setting ${flags.length} flag(s)${s.reset} on ${instances.length} instance(s) ${s.dim}(env: ${env})${s.reset}`
  );
  log('');

  const failures = [];
  for (const instance of instances) {
    log(instance);
    for (const { name, value } of flags) {
      const { path, body } = buildFlagSet({ env, instance, name, value });
      const res = await client.request('PUT', path, body);

      if (res.ok) {
        log(`  ${ok(`${name} = ${JSON.stringify(value)}`, s)}`);
      } else {
        failures.push(`${instance} (${name})`);
        log(`  ${fail(`${name} — ${res.error}`, s)}`);
      }
    }
  }

  log('');
  log(
    summaryLine(
      { total: instances.length * flags.length, failures, label: 'flag update(s) applied' },
      s
    )
  );
  return failures.length ? 1 : 0;
}
```

- [ ] **Step 4: Register the handler**

In `cozy-bender/src/cli.js`:

```js
import { flagsSet } from './flags.js';

const COMMANDS = {
  'apps update': appsUpdate,
  'flags set': flagsSet,
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd cozy-bender && node --test`
Expected: PASS — every suite

- [ ] **Step 6: Verify against a real instance**

Using the dev instance from Task 1:

```bash
export BENDER_TOKEN="<token>"
node bin/cozy-bender.js flags set <env> <dev-domain> cozy-bender.probe=true
node bin/cozy-bender.js flags set <env> <dev-domain> cozy-bender.probe=null
```

Expected: a `✔` line then `1/1 flag update(s) applied` for each, and the flag is
gone after the second call. Confirm with the `GET` one-liner from Task 1.

- [ ] **Step 7: Commit**

```bash
git add cozy-bender/src cozy-bender/test
git commit -m "feat(cozy-bender): Add flags set command"
```

---

### Task 7: `flags list`

**Files:**
- Modify: `cozy-bender/src/flags.js` (add the list command)
- Modify: `cozy-bender/src/cli.js` (register the handler)
- Test: `cozy-bender/test/flags.test.js` (append)

**Interfaces:**
- Consumes: everything Task 6 produced
- Produces:
  - `formatFlags({features: object, sources: Array<{id: string, attributes: object}>}): string[]` — the lines to print, in order
  - `async function flagsList(args: string[], deps?: object): Promise<number>`

- [ ] **Step 1: Write the failing test**

First widen the existing import at the top of `cozy-bender/test/flags.test.js`:

```js
import { parseFlagArg, parseFlagArgs, buildFlagSet, flagsSet, formatFlags, flagsList } from '../src/flags.js';
```

Then append the new tests:

```js
test('formats effective flags and their sources', () => {
  const lines = formatFlags({
    features: { 'a.flag': true, 'b.flag': 'dark' },
    sources: [
      { id: 'io.cozy.settings.flags.instance', attributes: { 'a.flag': true } },
      { id: 'io.cozy.settings.context', attributes: { 'b.flag': 'dark' } },
    ],
  });
  const out = lines.join('\n');
  assert.match(out, /a\.flag = true/);
  assert.match(out, /b\.flag = "dark"/);
  assert.match(out, /io\.cozy\.settings\.flags\.instance/);
  assert.match(out, /io\.cozy\.settings\.context/);
});

test('says so when an instance has no flags', () => {
  assert.match(formatFlags({ features: {}, sources: [] }).join('\n'), /No flags set/);
});

test('tolerates a response without a sources array', () => {
  const out = formatFlags({ features: { 'a.flag': 1 } }).join('\n');
  assert.match(out, /a\.flag = 1/);
});

test('lists the flags of one instance', async () => {
  let path;
  const fetchImpl = async (url) => {
    path = new URL(url).pathname;
    return new Response('{"features":{"a.flag":true},"sources":[]}', { status: 200 });
  };
  const lines = [];
  const code = await flagsList(['prod', 'a.cozy'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 0);
  assert.equal(path, '/instances/prod/a.cozy/features');
  assert.match(lines.join('\n'), /a\.flag = true/);
});

test('reports a failed read and exits 1', async () => {
  const fetchImpl = async () => new Response('{"error":"Instance not found"}', { status: 404 });
  const lines = [];
  const code = await flagsList(['prod', 'a.cozy'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  assert.match(lines.join('\n'), /HTTP 404, Instance not found/);
});

test('exits 1 with usage when the instance is missing', async () => {
  const lines = [];
  const code = await flagsList(['prod'], { token: 'tok', log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Usage: cozy-bender flags list/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd cozy-bender && node --test test/flags.test.js`
Expected: FAIL — `formatFlags is not a function` (or an import error)

- [ ] **Step 3: Write the implementation**

Append to `cozy-bender/src/flags.js`:

```js
const LIST_USAGE = `Usage: cozy-bender flags list <env> <instance>
Example: cozy-bender flags list prod a.mycozy.cloud`;

export function formatFlags({ features = {}, sources = [] }) {
  const entries = Object.entries(features);
  if (entries.length === 0) return ['No flags set'];

  const lines = entries.map(([name, value]) => `  ${name} = ${JSON.stringify(value)}`);

  // `sources` tells which layer each flag comes from (instance, context, ratio),
  // which is what makes it possible to tell an instance flag from an inherited one.
  const withFlags = sources.filter((s) => Object.keys(s.attributes ?? {}).length > 0);
  if (withFlags.length > 0) {
    lines.push('', 'Sources:');
    for (const source of withFlags) {
      lines.push(`  ${source.id}`);
      for (const [name, value] of Object.entries(source.attributes)) {
        lines.push(`    ${name} = ${JSON.stringify(value)}`);
      }
    }
  }

  return lines;
}

export async function flagsList(args, deps = {}) {
  const log = deps.log ?? console.log;
  const s = styles(deps.isTTY ?? process.stdout.isTTY ?? false);
  const [env, instance] = args;

  let token;
  try {
    if (!env || !instance) throw new Error(LIST_USAGE);
    token = deps.token ?? readToken();
  } catch (error) {
    log(error.message);
    return 1;
  }

  const client = createClient({
    token,
    fetchImpl: deps.fetchImpl,
    verbose: deps.verbose ?? process.env.BENDER_VERBOSE === '1',
    log,
  });
  const res = await client.request('GET', `/instances/${env}/${instance}/features`);

  if (!res.ok) {
    log(fail(`${instance}: ${res.error}`, s));
    return 1;
  }

  log(`${s.bold}Flags on ${instance}${s.reset} ${s.dim}(env: ${env})${s.reset}`);
  log('');
  for (const line of formatFlags(res.data ?? {})) log(line);
  return 0;
}
```

- [ ] **Step 4: Register the handler**

In `cozy-bender/src/cli.js`:

```js
import { flagsList, flagsSet } from './flags.js';

const COMMANDS = {
  'apps update': appsUpdate,
  'flags set': flagsSet,
  'flags list': flagsList,
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd cozy-bender && node --test`
Expected: PASS — every suite

- [ ] **Step 6: Verify against a real instance**

```bash
node bin/cozy-bender.js flags list <env> <dev-domain>
```

Expected: the instance's flags, then a `Sources:` block.

- [ ] **Step 7: Commit**

```bash
git add cozy-bender/src cozy-bender/test
git commit -m "feat(cozy-bender): Add flags list command"
```

---

### Task 8: Documentation

**Files:**
- Create: `cozy-bender/README.md`
- Modify: `README.md` (tool list at repository root)

**Interfaces:**
- Consumes: the CLI surface from Tasks 5-7
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write the tool README**

Create `cozy-bender/README.md`:

````markdown
# cozy-bender

A CLI for the [Bender](https://bender.cozycloud.cc/) API: deploy Cozy apps and
set feature flags on instances.

## Usage

```bash
npx github:linagora/twake-tools cozy-bender <command> [args...]
```

Or install globally:

```bash
npm install -g github:linagora/twake-tools
twake-tools cozy-bender <command> [args...]
```

## Prerequisites

A Bender personal API token, from https://bender.cozycloud.cc/ -> Profile ->
"Personal API token":

```bash
export BENDER_TOKEN="<your-token>"
```

## Commands

### `apps update`

```bash
cozy-bender apps update <env> <instances> <slug> <org/repo> [branch] [force]
```

- `env`: the environment, e.g. `prod`
- `instances`: target instance domains, comma-separated
- `slug`: the app slug, e.g. `home`
- `org/repo`: the GitHub repository with its organization, e.g. `cozy/cozy-home`
- `branch`: branch to deploy (optional, defaults to `build`)
- `force`: `true` or `false` (optional, defaults to `true`)

```bash
cozy-bender apps update prod a.mycozy.cloud,b.mycozy.cloud home cozy/cozy-home build
```

### `flags set`

```bash
cozy-bender flags set <env> <instances> <flag=value>...
```

Each flag is applied to each instance. Values are parsed as JSON and fall back to
a raw string when that fails:

| Argument | Value |
|---|---|
| `banks.show-transfers=true` | boolean `true` |
| `drive.max-upload=100` | number `100` |
| `home.theme=dark` | string `"dark"` |
| `some.list=[1,2]` | array `[1,2]` |
| `old.flag=null` | **deletes the flag** |
| `some.flag='"null"'` | string `"null"` |

```bash
cozy-bender flags set prod a.mycozy.cloud,b.mycozy.cloud \
    banks.show-transfers=true drive.max-upload=100 home.theme=dark
```

Flags are set with `source: instance`. Environment-wide defaults and ratio
rollouts are not supported.

### `flags list`

```bash
cozy-bender flags list <env> <instance>
```

Prints the instance's effective flags, then which source each one comes from.

## Output

One line per operation, plus a summary:

```
Setting 2 flag(s) on 2 instance(s) (env: prod)

a.mycozy.cloud
  ✔ banks.show-transfers = true
  ✘ drive.max-upload — HTTP 404, Instance not found
b.mycozy.cloud
  ✔ banks.show-transfers = true
  ✔ drive.max-upload = 100

3/4 flag update(s) applied — failed: a.mycozy.cloud (drive.max-upload)
```

A failure does not stop the run: the remaining operations are attempted, failures
are listed at the end, and the exit code is 1.

Set `BENDER_VERBOSE=1` to print the raw API response of every call.

## Development

```bash
npm test   # node --test, no dependencies
```

## License

MIT
````

- [ ] **Step 2: Update the root README**

In `README.md`, replace the `cozy-app-bender-updater` bullet:

```markdown
- [`cozy-bender`](cozy-bender) - deploy apps and set feature flags on instances through Bender
```

- [ ] **Step 3: Verify no stale references remain**

Run: `grep -rn "cozy-app-bender-updater" --exclude-dir=.git --exclude-dir=docs .`
Expected: no output. (The spec and this plan under `docs/` legitimately mention
the old name as history.)

- [ ] **Step 4: Run the full test suite one last time**

Run: `cd cozy-bender && node --test`
Expected: PASS, every suite

- [ ] **Step 5: Commit**

```bash
git add README.md cozy-bender/README.md
git commit -m "docs(cozy-bender): Document commands and update tool list"
```
