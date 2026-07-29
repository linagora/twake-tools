# Bender App Update

A minimalist tool to update a Cozy app on an instance through [Bender](https://bender.cozycloud.cc/).

## Installation

You can run this tool directly using npx:

```bash
npx github:linagora/twake-tools cozy-app-bender-updater <instance>[,<instance>...] <env> <slug> <org/repo_name> [branch] [force]
```

Or install it globally:

```bash
npm install -g github:linagora/twake-tools
twake-tools cozy-app-bender-updater <instance>[,<instance>...] <env> <slug> <org/repo_name> [branch] [force]
```

The underlying script can also be run directly from a clone of this repository:

```bash
./update-app-bender.sh <instance>[,<instance>...] <env> <slug> <org/repo_name> [branch] [force]
```

## Prerequisites

You need a Bender personal API token, available from https://bender.cozycloud.cc/ -> Profile -> "Personal API token".

Provide it either through the `BENDER_TOKEN` environment variable (takes precedence):

```bash
export BENDER_TOKEN="<your-token>"
```

or by setting `HARDCODED_TOKEN` directly in `update-app-bender.sh`.

## Usage

```bash
npx github:linagora/twake-tools cozy-app-bender-updater <instance>[,<instance>...] <env> <slug> <org/repo_name> [branch] [force]
```

- `instance`: the target instance(s), comma-separated, e.g. `inst1.mycozy.cloud,inst2.mycozy.cloud`
- `env`: the environment, e.g. `prod`
- `slug`: the app slug, e.g. `home`
- `org/repo_name`: the GitHub repository with its organization, e.g. `cozy/cozy-home` or `linagora/twake-drive`
- `branch`: the branch to deploy (optional, defaults to `build`)
- `force`: `true` or `false`, whether to force the update (optional, defaults to `true`)

Example:

```bash
npx github:linagora/twake-tools cozy-app-bender-updater inst1.mycozy.cloud,inst2.mycozy.cloud prod home cozy/cozy-home build
```

The update is applied to each instance in turn. If some instances fail, the
tool keeps going, lists the failed instances at the end, and exits with a
non-zero status.

## Output

One line per instance, plus a final summary:

```
Updating home from git://github.com/cozy/cozy-home.git#build (env: prod, force: true)

✔ inst1.mycozy.cloud: updated (version 1.42.0, state ready)
✘ inst2.mycozy.cloud: failed (HTTP 404) - Instance not found

1/2 instance(s) updated - failed: inst2.mycozy.cloud
```

Install [`jq`](https://jqlang.github.io/jq/) to get the installed version and
the error message from the API; without it, the tool still works but reports
less detail.

To inspect the raw API response of each call, run with `BENDER_VERBOSE=1`:

```bash
BENDER_VERBOSE=1 npx github:linagora/twake-tools cozy-app-bender-updater inst1.mycozy.cloud prod home cozy/cozy-home
```

## License

MIT
