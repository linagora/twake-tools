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
