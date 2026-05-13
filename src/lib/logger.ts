/**
 * Conditional logger — silences debug-level logs in production builds.
 * `error` always passes through; `log/warn/debug/info` only fire in dev.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
