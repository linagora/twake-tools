#!/usr/bin/env node

import { main } from '../src/cli.js';

try {
  // Use exitCode rather than exit() so buffered stdout (e.g. piped through
  // `less` or a file) is fully flushed before the process actually exits.
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  // A handler can throw on a response shape it didn't anticipate; print the
  // message instead of an unhandled-rejection stack trace and exit non-zero.
  console.error(error.message);
  process.exitCode = 1;
}
