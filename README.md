# twake-tools

CLI tools for Cozy apps

## Installation

### Via npx (recommended)

Run any tool directly without installation:

```bash
npx github:linagora/twake-tools <tool-name>
```

### Global Installation

Install once and use anywhere:

```bash
npm install -g github:linagora/twake-tools

# Then run tools directly
twake-tools <tool-name>
```

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

2. Users can immediately use it:
   ```bash
   npx github:linagora/twake-tools new-tool
   ```
