import chalk from 'chalk';

export const COLORS = {
  error: chalk.red,
  success: chalk.green,
  warning: chalk.yellow,
  info: chalk.blue,
};

export const ICONS = {
  error: '❌',
  success: '✅',
  warning: '⚠️',
  info: 'ℹ️',
};

export function error(message) {
  console.error(COLORS.error(`${ICONS.error} Error: ${message}`));
  process.exit(1);
}

export function success(message) {
  console.log(COLORS.success(`${ICONS.success} ${message}`));
}

export function warning(message) {
  console.log(COLORS.warning(`${ICONS.warning} ${message}`));
}

export function info(message) {
  console.log(COLORS.info(`${ICONS.info} ${message}`));
}
