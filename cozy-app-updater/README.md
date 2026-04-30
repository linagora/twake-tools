# Repo Updater

A minimalist tool to update dependencies in multiple React apps locally.

## Installation

You can run this tool directly using npx:

```bash
npx github:linagora/twake-tools cozy-app-updater
```

Or install it globally:

```bash
npm install -g github:linagora/twake-tools
twake-tools cozy-app-updater
```

## Usage

This tool works only if you have the following tree:

```
root-app-folder
├── app1
├── app2
├── app3
```

1. Navigate to the `root-app-folder`
2. Run the tool
3. Follow the interactive prompts

⚠️ This tool modify your git history
⚠️ You must not have WIP work in your apps

## License

MIT
