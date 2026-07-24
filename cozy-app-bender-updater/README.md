# Bender App Update

A minimalist script to update a Cozy app on an instance through [Bender](https://bender.cozycloud.cc/).

## Prerequisites

You need a Bender personal API token, available from https://bender.cozycloud.cc/ -> Profile -> "Personal API token".

Provide it either through the `BENDER_TOKEN` environment variable (takes precedence):

```bash
export BENDER_TOKEN="<your-token>"
```

or by setting `HARDCODED_TOKEN` directly in the script.

## Usage

```bash
./update-app-bender.sh <instance>[,<instance>...] <env> <slug> <org/repo_name> [branch] [force]
```

- `instance`: the target instance(s), comma-separated, e.g. `inst1.mycozy.cloud,inst2.mycozy.cloud`
- `env`: the environment, e.g. `prod`
- `slug`: the app slug, e.g. `home`
- `org/repo_name`: the GitHub repository with its organization, e.g. `cozy/cozy-home` or `linagora/twake-drive`
- `branch`: the branch to deploy (optional, defaults to `build`)
- `force`: `true` or `false`, whether to force the update (optional, defaults to `true`)

Example:

```bash
./update-app-bender.sh inst1.mycozy.cloud,inst2.mycozy.cloud prod home cozy/cozy-home build
```

The update is applied to each instance in turn. If some instances fail, the
script keeps going, lists the failed instances at the end, and exits with a
non-zero status.

## License

MIT
