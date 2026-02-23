# Decision Rationale — Saltus ATR Questionnaire

## Why this project exists

This is a **demo re-implementation** of a Standard Life production app. The original called real EValue APIs, used Amplify CLI, WAF, Ionic/Bootstrap, and required pre-existing AWS secrets. The demo deliberately mocks all external dependencies so it can be deployed to any developer AWS account with zero prerequisites. That constraint drives most of the decisions below.

---

## Infrastructure

**Single CDK stack (not Amplify CLI)** — The original used Amplify CLI for hosting and API provisioning. CDK was chosen instead because it gives explicit control over every resource, avoids Amplify's opinionated abstractions, and is easier to reason about for a self-contained demo. No hidden CloudFormation stacks or Amplify backend environments to manage.

**AppSync + Lambda resolvers (not REST API Gateway)** — Matches the original production architecture. AppSync also gives us a typed GraphQL schema that documents the API contract explicitly in `infrastructure/lib/schema.graphql`. The original used pipeline resolvers (Token Lambda → Questions Lambda) to chain OAuth token passing. Since the demo doesn't call EValue, each resolver maps directly to a single Lambda — simpler without sacrificing the same API shape.

**Cognito Identity Pool with unauthenticated access (not API keys or no auth)** — The app needs to be usable without login, but AppSync still needs an auth mode. Anonymous Cognito issues temporary AWS credentials scoped to `appsync:GraphQL` only. This means the API isn't truly "open" — you need valid (albeit temporary) credentials to call it — while still requiring zero user interaction for auth. An API key would have been simpler but expires after 365 days max and can't be scoped via IAM policies.

**`@sparticuz/chromium` via `nodeModules` (not a Lambda Layer)** — CDK's `NodejsFunction` with `nodeModules: ['@sparticuz/chromium']` tells esbuild to exclude the package from bundling and install it normally in the Lambda zip. A Layer would work but adds deployment complexity. The `nodeModules` approach keeps everything in a single construct. The PDF Lambda gets 2048MB RAM and 300s timeout because Chromium is memory-hungry and cold starts can take several seconds.

**S3 for PDF storage with pre-signed URLs (not inline response)** — PDFs can be several hundred KB. Returning them inline through AppSync/GraphQL would require base64 encoding (33% size increase) and risks hitting AppSync's 1MB response limit. S3 + pre-signed URL keeps the GraphQL response tiny and lets the browser fetch the binary directly. The 120-second URL expiry is short enough to limit link sharing but long enough for the download flow.

---

## Frontend

**Vite (not CRA)** — CRA is deprecated. Vite is the modern standard with faster builds, native ESM, and better plugin ecosystem. This also drove the decision away from `aws-appsync-auth-link` — that library uses Node.js `url.parse()` internally, which doesn't exist in Vite's browser environment. The custom SigV4 signing using `@smithy` packages (`src/graphql/client.ts`) is what AWS SDK v3 uses internally and works correctly in browser builds.

**Tailwind v4 + Headless UI v2 (not Ionic + Bootstrap + styled-components)** — The original app used three styling systems simultaneously. Tailwind v4's `@theme` directive in `src/index.css` replaces all three with a single approach, and Headless UI provides accessible primitives (RadioGroup) without opinionated styles. The `data-checked:` attribute pattern in Headless UI v2 maps directly onto Tailwind's data attribute variants — cleaner than v1's render-prop pattern.

**React Context + useReducer (not Redux/Zustand)** — The state shape is small and predictable: 13 questions, 13 answers, a current question index, and a risk rating. There's no async state, no cross-cutting concerns, no need for middleware. `useReducer` gives predictable state transitions with a clear action vocabulary (`src/context/questionnaireReducer.ts`) while avoiding dependency overhead.

**react-hook-form (not controlled inputs)** — Used specifically for required validation on the RadioGroup and clean `reset()` between questions. The `QuestionForm` component remounts via `key={currentQuestion}` on each question change, which naturally resets form state. react-hook-form's uncontrolled approach avoids unnecessary re-renders during the radio selection.

**Mock GraphQL link when no backend is configured** — When `VITE_APPSYNC_ENDPOINT` isn't set, Apollo falls back to an in-process mock (`src/graphql/mockLink.ts`) that runs the real scoring algorithm locally. This means frontend work never blocks on infrastructure deployment — the UI is fully interactive and visually testable from day one.

**Blob fetch + FileSaver for PDF download (not direct navigation)** — Navigating directly to the pre-signed S3 URL would open the PDF in-browser on most browsers rather than downloading it. The `axios.get(url, { responseType: 'blob' })` → `saveAs(blob, 'risk-results.pdf')` approach guarantees a download prompt with a consistent filename across all browsers.

---

## Scoring Logic

**Forward/reverse scoring by question (not a flat formula)** — Questions are framed in opposite directions. "I would enjoy exploring investment opportunities" (Q1) — agreeing strongly means high risk tolerance. "I want my investment money to be safe" (Q13) — agreeing strongly means low risk tolerance. Forward-scored questions use `6 - responseId`, reverse-scored use `responseId` directly. This matches how the original EValue API scored them.

**Q10 non-linear map `{1:1, 2:5, 3:3}`** — Q10 has only 3 options ("Low return/low risk", "Higher return/higher risk", "Mixture") that aren't evenly distributed on the risk spectrum. A linear `responseId` mapping would incorrectly treat "Mixture" as riskier than "Higher return". The explicit map preserves the intended semantics.

---

## What was deliberately left out

| Removed | Why |
|---|---|
| EValue OAuth + Secrets Manager | Demo doesn't call real APIs |
| WAF / rate limiting | Acceptable risk for internal demo |
| GTM / cookie consent | Not needed without real analytics |
| Pipeline resolvers | No token chaining needed without EValue |
| S3 lifecycle policies | Short-lived demo; manual cleanup acceptable |
| Back navigation in questionnaire | Original spec is forward-only by design |

---

## Known technical debt

- **Duplicate `data.ts`** — The 13 questions exist in both `infrastructure/lambda/getQuestions/data.ts` and `infrastructure/lambda/generatePDF/data.ts`. CDK bundles each Lambda independently, so sharing would require a monorepo structure or Lambda Layer. Accepted for demo scope.
- **No credential caching** — Cognito credentials are fetched fresh on every GraphQL request. Slightly wasteful but avoids expiry edge cases. A production app would cache with TTL-based refresh.
- **No rate limiting on Cognito identity pool** — Anyone can request anonymous credentials. Flagged as a production hardening item.
