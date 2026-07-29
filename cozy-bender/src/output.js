const ANSI = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

const PLAIN = { bold: '', dim: '', green: '', red: '', reset: '' };

export function styles(enabled) {
  return enabled ? { ...ANSI } : { ...PLAIN };
}

export function ok(text, s = PLAIN) {
  return `${s.green}✔${s.reset} ${text}`;
}

export function fail(text, s = PLAIN) {
  return `${s.red}✘${s.reset} ${text}`;
}

export function summaryLine({ total, failures, label }, s = PLAIN) {
  const head = `${total - failures.length}/${total} ${label}`;
  const colour = failures.length ? s.red : s.green;
  const line = `${colour}${s.bold}${head}${s.reset}`;
  return failures.length ? `${line} — failed: ${failures.join(', ')}` : line;
}
