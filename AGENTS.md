<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project rules

- Preserve the Next.js App Router, TypeScript, Tailwind theme, existing layouts,
  colors and interaction patterns. Make only changes required by the task.
- Keep user-facing and API error messages in `lib/chatUiText.ts`; share limits
  and route policies through `lib/securityPolicy.ts`. Do not introduce ICommand.
- Preserve both `demo` and `ollama` providers and existing Ollama defaults.
  Use `AI_PROVIDER=demo` for ordinary verification. Do not download/start models,
  call Ollama, stop its service or change its settings unless explicitly asked.
- Treat regex assessments as advisory, with human review and known false
  positives/negatives. Do not silently change scoring or demo-answer mappings.
- Validate and bound request bodies before processing. Keep generic API errors,
  static diagnostic event identifiers, timeouts and output limits. Never log
  request bodies, personal information, passwords, cookies or model responses.
- Authorize protected data at its access point, in addition to Proxy checks.
  Preserve signed-cookie protections and redirect allowlists. Logout deletes
  the browser cookie; copied cookies are not immediately revoked server-side.
- Keep the portfolio demo free of Redis, databases and external shared stores.
  Do not claim shared rate/concurrency limits or immediate cookie revocation.
- Respect the lockfile; use `npm ci` for clean installs. Review official
  advisories and peer compatibility before updating. Do not use audit fix --force,
  unsafe major overrides or unrelated dependency/library replacements.
- Run lint, typecheck, automated tests, a demo build and audit for security
  changes. Add regression cases for affected security boundaries. Do not add
  Redis integration tests or independent verification tools.
- Verify main forms and protected pages in a browser. Distinguish real services,
  local adapters and mocks in reports; do not claim untested fixes or features.
- Keep environment files, secrets and generated artifacts out of Git. Document
  current behavior, environment requirements, mock data and remaining risks.
- Work on a task branch. Do not commit/push directly to main, force push or merge
  without the user's explicit approval. Inspect overlapping Dependabot PRs;
  never merge them automatically. Keep these development rules in this file.
