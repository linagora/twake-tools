import { appsUpdate } from './apps.js';
import { flagsList, flagsSet } from './flags.js';

export const USAGE = `Usage: cozy-bender <command> [args...]

  cozy-bender apps update <env> <instances> <slug> <org/repo> [branch] [force]
  cozy-bender flags set   <env> <instances> <flag=value>...
  cozy-bender flags list  <env> <instance>

<instances> is one or more instance domains separated by commas.

Requires a Bender personal API token in BENDER_TOKEN. Get one from
https://bender.cozycloud.cc/ -> Profile -> "Personal API token".`;

// Handlers are looked up by "<group> <action>" so that adding a Bender endpoint
// is one entry here plus one module under src/.
const COMMANDS = {
  'apps update': appsUpdate,
  'flags set': flagsSet,
  'flags list': flagsList,
};

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
