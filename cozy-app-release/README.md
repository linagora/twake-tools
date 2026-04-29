# cozy-app-release

CLI tool for creating Cozy app releases and betas.

## Installation

### Via npx from GitHub (recommended)

```bash
npx github:linagora/twake-tools cozy-app-release
```

### Local installation from GitHub

```bash
npm install -g github:linagora/twake-tools
twake-tools cozy-app-release
```

## Prerequisites

- Node.js >= 24
- Git repository
- GitHub CLI (`gh`) installed and authenticated
- No uncommitted changes in the repository

## Usage

Run the command in your Cozy app repository:

```bash
npx github:linagora/twake-tools cozy-app-release
```

The CLI will guide you through:
1. **New beta** - Create a new beta on a new release branch
2. **Add beta** - Add a beta to an existing release branch
3. **Final release** - Create a final release on an existing branch

## Features

- Interactive menu with @inquirer/prompts
- Automatic version bumping
- GitHub release creation
- Git tag and branch management
- Colored output with chalk

## Development

```bash
# Install dependencies
npm install

# Run locally
npm start

# Run tests
npm test
```

## License

MIT
