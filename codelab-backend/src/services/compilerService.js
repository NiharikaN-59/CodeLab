const axios = require('axios');

/**
 * Compiler service using Judge0 API.
 * Supports:
 *  - Free public Judge0 CE (default, no key): https://ce.judge0.com
 *  - RapidAPI Judge0 CE (requires JUDGE0_API_KEY): https://judge0-ce.p.rapidapi.com
 *  - Self-hosted Judge0 (set JUDGE0_URL, optional JUDGE0_AUTH_TOKEN)
 */

const DEFAULT_PUBLIC_URL = 'https://ce.judge0.com';
const RAPIDAPI_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';

// Language ID mapping for Judge0
const LANGUAGE_IDS = {
  javascript: 63,   // Node.js
  typescript: 74,   // TypeScript
  python: 71,       // Python 3
  java: 62,         // Java
  c: 50,            // C (GCC)
  cpp: 54,          // C++ (GCC)
  csharp: 51,       // C#
  go: 60,           // Go
  ruby: 72,        // Ruby
  php: 68,          // PHP
  rust: 73,         // Rust
  swift: 83,        // Swift
  kotlin: 78,       // Kotlin
  bash: 46,         // Bash
  r: 80,            // R
  sql: 82,          // SQL
};

const STATUS_MAP = {
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV)',
  8: 'Runtime Error (SIGXFSZ)',
  9: 'Runtime Error (SIGFPE)',
  10: 'Runtime Error (SIGABRT)',
  11: 'Runtime Error (NZEC)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
};

/**
 * Read Judge0 config lazily so dotenv / env changes are always honored.
 */
const getJudge0Config = () => {
  const rawUrl = process.env.JUDGE0_URL || DEFAULT_PUBLIC_URL;
  const url = rawUrl.replace(/\/$/, '');
  const apiKey =
    process.env.JUDGE0_API_KEY &&
    !process.env.JUDGE0_API_KEY.startsWith('your-') &&
    !process.env.JUDGE0_API_KEY.startsWith('sk-your')
      ? process.env.JUDGE0_API_KEY
      : null;
  const authToken = process.env.JUDGE0_AUTH_TOKEN || null;
  const host = process.env.JUDGE0_HOST || RAPIDAPI_HOST;
  const isRapidApi = url.includes('rapidapi') || url === RAPIDAPI_URL;
  const mode = isRapidApi && apiKey ? 'rapidapi' : apiKey || authToken ? 'authenticated' : 'keyless-ce';
  return { url, apiKey, authToken, host, isRapidApi, mode };
};

const buildHeaders = (config) => {
  const headers = { 'Content-Type': 'application/json' };
  if (config.isRapidApi && config.apiKey) {
    headers['X-RapidAPI-Key'] = config.apiKey;
    headers['X-RapidAPI-Host'] = config.host;
  } else if (config.authToken) {
    headers['X-Auth-Token'] = config.authToken;
  } else if (config.apiKey && !config.isRapidApi) {
    // Custom / self-hosted instance protecting with X-Auth-Token
    headers['X-Auth-Token'] = config.apiKey;
  }
  return headers;
};

const getCompilerStatus = () => {
  const config = getJudge0Config();
  return {
    configured: true,
    mode: config.mode,
    url: config.url,
    hasKey: !!config.apiKey,
    languages: Object.keys(LANGUAGE_IDS).length,
  };
};

const checkJudge0Reachable = async (timeoutMs = 5000) => {
  const config = getJudge0Config();
  try {
    await axios.get(`${config.url}/languages`, {
      headers: buildHeaders(config),
      timeout: timeoutMs,
    });
    return true;
  } catch {
    return false;
  }
};

const encode = (str) => Buffer.from(str ?? '', 'utf8').toString('base64');

const decode = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val !== 'string') return val;
  try {
    return Buffer.from(val, 'base64').toString('utf8');
  } catch {
    return val;
  }
};

const formatJudge0Result = (result) => {
  const statusId = result?.status?.id;
  const statusDesc = STATUS_MAP[statusId] || result?.status?.description || 'Unknown';
  const isSuccess = statusId === 3;
  const stdout = decode(result?.stdout);
  const stderr = decode(result?.stderr);
  const compileOutput = decode(result?.compile_output);
  return {
    success: isSuccess,
    status: statusDesc,
    output: stdout || null,
    stderr: stderr || compileOutput || null,
    compilationErrors: compileOutput ? [{ message: compileOutput }] : [],
    executionTime: result?.time ? `${result.time}s` : null,
    memoryUsed: result?.memory ? `${result.memory}KB` : null,
    mock: false,
  };
};

const toActionableError = (err, config) => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const detail =
    (data && (data.message || data.error)) || err.message || 'Unknown error';

  if (status === 429) {
    return 'Compiler rate limit exceeded on the public Judge0 instance. Wait a few seconds and try again, or set JUDGE0_API_KEY / self-host Judge0 via JUDGE0_URL.';
  }
  if (status === 401 || status === 403) {
    return `Judge0 authentication failed (${status}). Check JUDGE0_API_KEY / JUDGE0_AUTH_TOKEN for ${config.url}.`;
  }
  if (err.code === 'ECONNABORTED' || /timeout/i.test(detail)) {
    return `Compiler request timed out reaching ${config.url}. The public instance may be busy — retry, or set JUDGE0_URL to a self-hosted instance.`;
  }
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || /Network Error|getaddrinfo|connect/i.test(detail)) {
    return `Cannot reach Judge0 at ${config.url}. Check network / JUDGE0_URL, or self-host Judge0 (docker run judge0/judge0).`;
  }
  return `Compiler service error: ${detail}`;
};

/**
 * Compile and run code using Judge0 (free public instance by default).
 */
const compileCode = async (language, code, stdin = '') => {
  const languageId = LANGUAGE_IDS[language];

  if (!languageId) {
    return {
      success: false,
      status: 'Error',
      output: null,
      stderr: `Language "${language}" is not supported for compilation.`,
      compilationErrors: [],
      mock: false,
    };
  }

  const config = getJudge0Config();
  const headers = buildHeaders(config);
  const payload = {
    source_code: encode(code),
    language_id: languageId,
    stdin: encode(stdin || ''),
  };

  try {
    // Fast path: synchronous execution (public CE supports wait=true)
    try {
      const syncResponse = await axios.post(
        `${config.url}/submissions?base64_encoded=true&wait=true`,
        payload,
        { headers, timeout: 20000 }
      );
      const syncResult = syncResponse.data;
      // wait=true returns the full submission; if still queued, fall through to polling
      if (syncResult && syncResult.status && syncResult.status.id >= 3) {
        return formatJudge0Result(syncResult);
      }
      if (syncResult && syncResult.token) {
        const polled = await pollSubmission(config, headers, syncResult.token);
        if (polled) return formatJudge0Result(polled);
        return formatJudge0Result(syncResult);
      }
      if (syncResult && syncResult.status) {
        return formatJudge0Result(syncResult);
      }
    } catch (syncErr) {
      // If sync endpoint unsupported, fall back to async below; else rethrow actionable errors
      const syncStatus = syncErr?.response?.status;
      if (syncStatus && syncStatus !== 400 && syncStatus !== 404 && syncStatus !== 405) {
        throw syncErr;
      }
      // else: fall through to async submission
    }

    // Fallback path: async submission + polling (RapidAPI + older instances)
    const submitResponse = await axios.post(
      `${config.url}/submissions?base64_encoded=true&wait=false`,
      payload,
      { headers, timeout: 10000 }
    );

    const token = submitResponse.data.token;
    if (!token) {
      throw new Error('Judge0 did not return a submission token');
    }

    const result = await pollSubmission(config, headers, token);
    if (!result) {
      return {
        success: false,
        status: 'Error',
        output: null,
        stderr: 'Compiler timed out waiting for Judge0 result. Try again.',
        compilationErrors: [{ message: 'Polling timed out' }],
        mock: false,
      };
    }
    return formatJudge0Result(result);
  } catch (err) {
    // If we already built an actionable message, keep it
    if (err?.isActionable) throw err;
    console.error('Judge0 API error:', err.message);
    const message = toActionableError(err, config);
    return {
      success: false,
      status: 'Error',
      output: null,
      stderr: message,
      compilationErrors: [{ message }],
      mock: false,
    };
  }
};

const pollSubmission = async (config, headers, token) => {
  let result = null;
  const maxAttempts = 15;

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusResponse = await axios.get(
      `${config.url}/submissions/${token}?base64_encoded=true`,
      { headers, timeout: 10000 }
    );
    result = statusResponse.data;
    if (result.status && result.status.id >= 3) break;
  }
  return result;
};

module.exports = {
  compileCode,
  LANGUAGE_IDS,
  getJudge0Config,
  getCompilerStatus,
  checkJudge0Reachable,
};
