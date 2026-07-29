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

  // Drop empty entries (from "a.cozy,,b.cozy" or a trailing comma) rather than
  // the bash IFS-split behaviour this replaces, which would PUT to an empty domain.
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
