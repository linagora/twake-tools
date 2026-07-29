export const BASE_URL = 'https://bender.cozycloud.cc';

const TOKEN_HELP = `No Bender token provided.
Get one from https://bender.cozycloud.cc/ -> Profile -> "Personal API token",
then run: export BENDER_TOKEN="<your-token>"`;

export function readToken(env = process.env) {
  const token = env.BENDER_TOKEN;
  if (!token) throw new Error(TOKEN_HELP);
  return token;
}

// Bender reports errors in several shapes depending on the endpoint, so try each
// known one before falling back to a short excerpt of the raw body.
export function errorDetail(rawBody) {
  try {
    const body = JSON.parse(rawBody);
    const detail =
      body?.error ?? body?.errors?.[0]?.detail ?? body?.errors?.[0]?.title ?? body?.message;
    if (detail) return String(detail);
  } catch {
    // Not JSON — fall through to the raw-body fallbacks.
  }

  const trimmed = rawBody.trim();
  if (!trimmed) return 'no response body';
  if (trimmed.startsWith('<')) {
    return 'unexpected HTML response (run again with BENDER_VERBOSE=1 to see it)';
  }
  return trimmed.replace(/\s+/g, ' ').slice(0, 160);
}

export function errorMessage({ status, rawBody }) {
  if (status === 0) return 'request failed (could not reach Bender)';
  // A redirect means Bender bounced us to the login page rather than answering.
  if (status === 401 || status === 403 || (status >= 300 && status < 400)) {
    return `authentication failed (HTTP ${status}) — check your Bender token`;
  }
  return `HTTP ${status}, ${errorDetail(rawBody)}`;
}

export function createClient({
  token,
  fetchImpl = fetch,
  baseUrl = BASE_URL,
  verbose = false,
  log = console.log,
} = {}) {
  async function request(method, path, body) {
    const init = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    let status = 0;
    let rawBody = '';
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, init);
      status = response.status;
      rawBody = await response.text();
    } catch {
      // Keep status 0 so callers get one uniform "could not reach Bender" error.
    }

    if (verbose) log(rawBody);

    let data = null;
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Leave data null; error reporting works off rawBody.
    }

    const ok = status >= 200 && status < 300;
    return { ok, status, data, rawBody, error: ok ? null : errorMessage({ status, rawBody }) };
  }

  return { request };
}
