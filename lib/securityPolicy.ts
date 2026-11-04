// Shared request-size and timeout policy.
export const securityPolicy = {
  messageMaxChars: 4000,
  requestMaxBytes: 32 * 1024,
  loginMaxBytes: 4096,
  bodyTimeoutMs: 5000,
  processingTimeoutMs: 25000,
  ollamaMaxTokens: 512,
  ollamaResponseMaxBytes: 128 * 1024
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
