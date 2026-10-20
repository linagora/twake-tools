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

The existing release branch is the highest stable version among
`origin/release/x.y.z` branches, compared using SemVer. Other names, including
`release/toto_1.49.0` and branches with prerelease suffixes, are ignored.
If none qualify, only **New beta** and **Quit** are offered.

Before creating a new beta, choose the next development version for the base
branch. The next minor version is suggested; you can enter any greater stable
version, or `skip` to leave the base branch unchanged. The release branch keeps
the current version. Cancelling this prompt creates no release branch or tag.

The base branch is updated only by a fast-forward pull. The version bump uses
a normal push and stops if the remote branch has diverged. Resolve the branch
divergence before retrying; an already published beta must not be recreated.

### Prepared release notes

Use a Markdown file for a reviewed, human-readable changelog:

```bash
npx github:linagora/twake-tools cozy-app-release --notes-file /path/to/release-notes.md
```

This works for a new beta, another beta, or a final release. The file is read
before any branch changes, and its contents are published as written. Missing,
unreadable, or empty files stop the command before release preparation begins.
Without this option, GitHub generates the notes as before.

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
