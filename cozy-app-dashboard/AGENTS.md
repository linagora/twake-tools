# Agent Guidelines for repo-dashboard

This document provides guidelines for agentic coding tools operating in this repository.

## Build/Lint/Test Commands

### Development
```bash
npm run dev  # Start development server on port 3000
```

### Building
```bash
npm run build  # Build for production
npm run serve  # Preview production build
```

### Testing
```bash
npm run test  # Run all tests with Vitest
npm run test -- --testNamePattern="test name"  # Run specific test by name
npm run test -- --dir=src/components  # Run tests in specific directory
npm run test -- --watch  # Run tests in watch mode
```

### Linting & Formatting
```bash
npm run lint    # Run Biome linter
npm run format  # Run Biome formatter
npm run check   # Run Biome check (lint + format)
```

## Code Style Guidelines

### Imports
- Use ES modules (`import/export` syntax)
- Organize imports automatically with Biome (configured in biome.json)
- Group imports: built-ins, externals, internals, types
- Use path aliases: `@/*` for `./src/*` (configured in tsconfig.json)

### Formatting
- **Indentation**: Tabs (configured in biome.json)
- **Quotes**: Double quotes for JavaScript/TypeScript strings
- **Semicolons**: Required
- **Line length**: No strict limit, but keep lines readable
- **Trailing commas**: Required in multi-line objects/arrays

### TypeScript
- **Strict mode**: Enabled (strict: true in tsconfig.json)
- **Type annotations**: Required for function parameters and return types
- **Interfaces vs Types**: Prefer `interface` for object shapes, `type` for unions/complex types
- **Generics**: Use descriptive generic type names (T, U, V or more specific)
- **No unused variables**: Enabled (noUnusedLocals, noUnusedParameters)

### Naming Conventions
- **Files**: kebab-case (e.g., `my-component.tsx`)
- **Components**: PascalCase (e.g., `MyComponent`)
- **Functions**: camelCase (e.g., `myFunction`)
- **Variables**: camelCase (e.g., `myVariable`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MY_CONSTANT`)
- **Types/Interfaces**: PascalCase (e.g., `MyType`, `MyInterface`)
- **Boolean variables**: Prefix with `is`, `has`, `can`, etc. (e.g., `isLoading`, `hasError`)

### React Specific
- **Components**: Use function components with TypeScript
- **Hooks**: Use built-in React hooks and custom hooks
- **Props**: Always type component props using interfaces
- **Event handlers**: Prefix with `handle` (e.g., `handleClick`)
- **State**: Use `useState`, `useReducer`, or TanStack Store for state management

### Error Handling
- **Try/catch**: Use for async operations and potential errors
- **Error boundaries**: Use React error boundaries for component errors
- **Custom errors**: Create custom error classes when appropriate
- **Error logging**: Log errors appropriately (console.error in development)

### Comments
- **Avoid unnecessary comments**: Code should be self-documenting
- **Use JSDoc**: For complex functions and component props
- **TODO comments**: Use `// TODO:` prefix for temporary notes
- **FIXME comments**: Use `// FIXME:` prefix for known issues

### Testing
- **Framework**: Vitest
- **Location**: Test files should be colocated with source files
- **Naming**: `*.test.ts` or `*.spec.ts`
- **Coverage**: Aim for high test coverage
- **Mocking**: Use Vitest's built-in mocking capabilities

### Git Conventions
- **Commit messages**: Use conventional commits format
- **Branch naming**: kebab-case with feature/fix prefix (e.g., `feature/new-dashboard`)
- **Pull requests**: Reference issues, include description and screenshots if UI changes

## Project Structure

```
src/
├── components/    # Reusable React components
├── context/       # React context providers
├── data/          # Data models and services
├── routes/        # Route components (TanStack Router)
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── styles.css      # Global styles
```

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Routing**: TanStack Router
- **State Management**: TanStack Store/React Query
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Linting/Formatting**: Biome
- **Bundler**: Vite

## Additional Notes

- The project uses TanStack Router's file-based routing system
- Components should be designed for reusability
- Follow React best practices for hooks and component composition
- Use TanStack Query for data fetching when appropriate
- Keep components focused and small
- Extract complex logic into custom hooks or utility functions