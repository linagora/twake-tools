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

// The plan's preferred reading of the (ambiguous) Bender OpenAPI spec is that
// `value` stores the JSON value as-is, not JSON-encoded again into a string.
// Pending confirmation against a live instance (see Task 1).
export function encodeFlagValue(value) {
  return value;
}

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
    // Drop empty entries (from "a.cozy,,b.cozy" or a trailing comma) rather than
    // the bash IFS-split behaviour this replaces, which would PUT to an empty domain.
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
        // Log what was actually sent over the wire, not the parsed input value,
        // so this line stays the source of truth once encodeFlagValue's
        // encoding choice is confirmed against a live Bender.
        log(`  ${ok(`${name} = ${JSON.stringify(encodeFlagValue(value))}`, s)}`);
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

const LIST_USAGE = `Usage: cozy-bender flags list <env> <instance>
Example: cozy-bender flags list prod a.mycozy.cloud`;

export function formatFlags({ features, sources }) {
  // Bender returns `{"features": null}` (not `undefined`) when an instance has
  // no flag document at all, and default parameters only cover `undefined` —
  // coerce explicitly so that shape doesn't crash instead of printing "No flags set".
  const entries = Object.entries(features ?? {});
  if (entries.length === 0) return ['No flags set'];

  const lines = entries.map(([name, value]) => `  ${name} = ${JSON.stringify(value)}`);

  // `sources` tells which layer each flag comes from (instance, context, ratio),
  // which is what makes it possible to tell an instance flag from an inherited one.
  // Also guard against a malformed non-array shape rather than crashing on .filter.
  const withFlags = (Array.isArray(sources) ? sources : []).filter(
    (source) => Object.keys(source.attributes ?? {}).length > 0
  );
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
    // Unlike `apps update`/`flags set`, this endpoint takes exactly one
    // instance. A comma-separated list would silently build a path segment
    // like "a.cozy,b.cozy" and 404 instead of the clear "single instance" error.
    if (instance.includes(',')) throw new Error('flags list takes a single instance');
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
