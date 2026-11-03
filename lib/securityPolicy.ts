// Shared limits: do not accept client-provided limits or identity headers.
export const securityPolicy = {
  messageMaxChars: 4000,
  requestMaxBytes: 32 * 1024,
  loginMaxBytes: 4096,
  bodyTimeoutMs: 5000,
  processingTimeoutMs: 25000,
  storeTimeoutMs: 2000,
  chatRequestsPerMinute: 60,
  loginAttemptsPerWindow: 10,
  loginWindowMs: 15 * 60 * 1000,
  concurrentChats: 4,
  leaseMs: 35000,
  ollamaMaxTokens: 512,
  ollamaResponseMaxBytes: 128 * 1024,
  memoryMaxEntries: 10000
} as const;

export const appPaths = {
  admin: '/admin',
  settings: '/settings',
  login: '/admin-login'
} as const;

// Only these exact destinations are used by the application. Encoded, normalized,
// query-bearing and protocol-relative variants are deliberately not accepted.
export const getSafeRedirectPath = (value: unknown): string =>
  value === appPaths.settings ? appPaths.settings : appPaths.admin;
