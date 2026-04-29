# twake-tools

CLI tools for Cozy apps

## Available Tools

- **cozy-app-release**: Create and manage releases for Cozy apps (betas and final releases)

## Installation

### Via npx (recommended)

Run any tool directly without installation:

```bash
# Create/manage releases for your Cozy app
npx github:linagora/twake-tools cozy-app-release
```

### Global Installation

Install once and use anywhere:

```bash
npm install -g github:linagora/twake-tools

# Then run tools directly
twake-tools cozy-app-release
```

## Usage

### cozy-app-release

Interactive CLI for managing app releases:

```bash
npx github:linagora/twake-tools cozy-app-release
```

This tool will guide you through:
1. **New beta**: Create a new release branch and first beta tag
2. **Add beta**: Add another beta to an existing release branch
3. **Create final release**: Tag and release the final version

**Requirements:**
- Node.js >= 18
- Git repository
- GitHub CLI (`gh`) installed and authenticated
- No uncommitted changes

## How it works

The wrapper script handles:
- **First run**: Downloads and installs tool dependencies (~30-60s)
- **Subsequent runs**: Uses cached installation (instant)
- **Version updates**: Automatically reinstalls when a new version is available

Cached tools are stored in `~/.twake-tools-cache/`

## Development

To add a new tool:

1. Create a directory `new-tool/` with:
   - `package.json` (name, version, dependencies)
   - `bin/new-tool.js` (entry point)
   - `src/` (source code)

2. Update this README with the new tool

3. Users can immediately use it:
   ```bash
   npx github:linagora/twake-tools new-tool
   ```
