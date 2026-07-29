# twake-tools

CLI tools for Cozy apps

## Available tools

- [`cozy-app-release`](cozy-app-release) - create app releases and betas
- [`cozy-app-updater`](cozy-app-updater) - update dependencies in multiple apps locally
- [`cozy-app-bender-updater`](cozy-app-bender-updater) - update an app on instances through Bender

Run `npx github:linagora/twake-tools` without arguments to list them.

## Installation

### Via npx (recommended)

Run any tool directly without installation:

```bash
npx github:linagora/twake-tools <tool-name> [tool-args...]
```

### Global Installation

Install once and use anywhere:

```bash
npm install -g github:linagora/twake-tools

# Then run tools directly
twake-tools <tool-name> [tool-args...]
```

## How it works

The wrapper script handles:
- **First run**: Downloads and installs tool dependencies (~30-60s)
- **Subsequent runs**: Uses cached installation (instant)
- **Version updates**: Automatically reinstalls when a new version is available
- **Arguments**: Everything after the tool name is forwarded to the tool as-is
- **Dependency-free tools**: `npm install` is skipped entirely

Cached tools are stored in `~/.twake-tools-cache/`

## Development

To add a new tool:

1. Create a directory `new-tool/` with:
   - `package.json` (name, version, dependencies)
   - `bin/new-tool.js` (entry point)
   - `src/` (source code)

2. Users can immediately use it:
   ```bash
   npx github:linagora/twake-tools new-tool
   ```
