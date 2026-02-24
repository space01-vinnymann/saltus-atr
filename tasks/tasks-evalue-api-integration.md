# Tasks: EValue API Integration

## Relevant Files

- `infrastructure/lambda/getEvalueToken/index.ts` - New Lambda function for OAuth2 token fetching from EValue
- `infrastructure/lambda/getEvalueToken/index.test.ts` - Unit tests for the token Lambda
- `infrastructure/lambda/getQuestions/index.ts` - Modified to call EValue API instead of returning hardcoded data
- `infrastructure/lambda/getQuestions/index.test.ts` - Unit tests for the modified getQuestions Lambda
- `infrastructure/lambda/getQuestions/data.ts` - To be deleted (hardcoded questions)
- `infrastructure/lambda/calculateRisk/index.ts` - Modified to call EValue API instead of local scoring
- `infrastructure/lambda/calculateRisk/index.test.ts` - Unit tests for the modified calculateRisk Lambda
- `infrastructure/lambda/calculateRisk/scoring.ts` - To be deleted (local scoring logic)
- `infrastructure/lambda/calculateRisk/scoring.test.ts` - To be deleted (tests for local scoring)
- `infrastructure/lambda/generatePDF/index.ts` - Modified to read questions from event input instead of hardcoded data
- `infrastructure/lambda/generatePDF/data.ts` - To be deleted (hardcoded questions duplicate)
- `infrastructure/lambda/generatePDF/template.test.ts` - May need updates if template function signature changes
- `infrastructure/lib/saltus-atr-stack.ts` - CDK stack: new Lambda, pipeline resolvers, IAM policies, env vars
- `infrastructure/lib/schema.graphql` - Updated GraphQL schema with new input types for PDF questions
- `src/graphql/mutations.ts` - Updated mutation query string to include RiskQuestions
- `src/pages/Results.tsx` - Updated PDF download handler to pass questions from state

### Notes

- Lambda tests use Vitest (`vitest run --exclude 'dist/**'` from the `infrastructure/` directory)
- Frontend tests use Jest (`yarn test` from the project root)
- Use `yarn test` to run frontend tests. Use `cd infrastructure && yarn test` to run Lambda tests.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:

- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

After completing each parent task:

1. Pause
2. Verify the work:
   - Run `yarn build` — confirm no type errors
   - Run `yarn lint` — confirm no lint errors
   - Run `yarn test` — confirm no test failures
   - Manually review changed files for obvious issues
3. Summarise what was implemented
4. List:
   - Assumptions made
   - Failure modes
   - Production risks
5. If any verification step failed, fix before continuing
6. Ask explicitly for approval before continuing

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch: `git checkout -b feature/evalue-api-integration`

- [x] 1.0 Create the `getEvalueToken` Lambda
  - [x] 1.1 Create the directory `infrastructure/lambda/getEvalueToken/`
  - [x] 1.2 Create `infrastructure/lambda/getEvalueToken/index.ts` with the handler that: reads `SECRET_NAME` and `EVALUE_API_BASE_URL` from environment variables; fetches the secret from AWS Secrets Manager using `@aws-sdk/client-secrets-manager` (`GetSecretValueCommand`); extracts `EVALUE_CONSUMER_KEY` and `EVALUE_CONSUMER_SECRET` from the secret JSON; makes a `POST` to `{EVALUE_API_BASE_URL}/token` with Basic auth header (`base64(key:secret)`), `Content-Type: application/x-www-form-urlencoded`, body `grant_type=client_credentials`; returns the parsed JSON response containing `access_token`
  - [x] 1.3 Add error handling: throw `"Failed to retrieve EValue credentials"` if Secrets Manager fetch fails; throw `"Failed to obtain EValue access token"` if the token endpoint returns non-2xx, logging the HTTP status and response body
  - [x] 1.4 Create `infrastructure/lambda/getEvalueToken/index.test.ts` with Vitest tests covering: successful token fetch (mock Secrets Manager + fetch); Secrets Manager failure; EValue token endpoint non-2xx response; missing `SECRET_NAME` env var; missing `EVALUE_API_BASE_URL` env var
  - [x] 1.5 Run `cd infrastructure && yarn test` to confirm all tests pass

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [x] 2.0 Modify `getQuestions` Lambda to call EValue API
  - [x] 2.1 Read the current `infrastructure/lambda/getQuestions/index.ts` to understand the existing handler signature and return shape
  - [x] 2.2 Rewrite `infrastructure/lambda/getQuestions/index.ts` to: read `access_token` from `event.prev.result.access_token` (forwarded by pipeline resolver); read `EVALUE_API_BASE_URL` from env var; `POST` to `{EVALUE_API_BASE_URL}/riskQuestionnaire/1.0.0/riskProfiler/getQuestionnaireData` with Bearer token and body `{ "questionnaireName": "5risk" }`; transform the EValue response (`questionId`->`id` as string, `questionText`->`text`, `responses[].responseId`->`answers[].id` as string, `responses[].responseText`->`answers[].text`); return the transformed array
  - [x] 2.3 Add error handling: throw `"Missing EValue access token"` if `access_token` is missing; throw `"Failed to fetch questions from EValue"` on non-2xx, logging status and body
  - [x] 2.4 Delete `infrastructure/lambda/getQuestions/data.ts`
  - [x] 2.5 Create `infrastructure/lambda/getQuestions/index.test.ts` with Vitest tests covering: successful fetch and field mapping transformation (mock `global.fetch`); missing `access_token` in event; EValue API non-2xx response; verify returned shape matches GraphQL `Question` type (`id: string, text: string, answers: [{ id: string, text: string }]`)
  - [x] 2.6 Run `cd infrastructure && yarn test` to confirm all tests pass

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [x] 3.0 Modify `calculateRisk` Lambda to call EValue API
  - [x] 3.1 Read the current `infrastructure/lambda/calculateRisk/index.ts` to understand the existing handler signature
  - [x] 3.2 Rewrite `infrastructure/lambda/calculateRisk/index.ts` to: read `access_token` from `event.prev.result.access_token`; read responses from `event.arguments.responses`; read `EVALUE_API_BASE_URL` from env var; `POST` to `{EVALUE_API_BASE_URL}/riskQuestionnaire/1.0.0/riskProfiler/calculateRisk` with Bearer token and body `{ "responses": [...], "questionnaireName": "5risk", "term": 15 }` (ensure `questionId` and `responseId` are strings); clamp returned `riskProfile` to [1, 5] and truncate to integer via `parseInt()`; return `{ rating: <integer> }`
  - [x] 3.3 Add error handling: throw `"Missing EValue access token"` if missing; throw `"Failed to calculate risk rating"` on non-2xx, logging status and body
  - [x] 3.4 Delete `infrastructure/lambda/calculateRisk/scoring.ts` and `infrastructure/lambda/calculateRisk/scoring.test.ts`
  - [x] 3.5 Create `infrastructure/lambda/calculateRisk/index.test.ts` with Vitest tests covering: successful risk calculation and transformation (mock `global.fetch`); clamping below 1 returns 1; clamping above 5 returns 5; decimal truncation (e.g., 3.7 -> 3); missing `access_token`; EValue API non-2xx response
  - [x] 3.6 Run `cd infrastructure && yarn test` to confirm all tests pass

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [x] 4.0 Update GraphQL schema and `generatePDF` Lambda to accept questions from frontend
  - [x] 4.1 Update `infrastructure/lib/schema.graphql`: add `RiskQuestionInput` input type (`questionId: Int!, questionText: String!, responses: [RiskResponseInput]!`), add `RiskResponseInput` input type (`responseId: Int!, responseText: String!`), add `RiskQuestions: [RiskQuestionInput]!` field to `RiskResultPDFInput`
  - [x] 4.2 Read `infrastructure/lambda/generatePDF/index.ts` and `infrastructure/lambda/generatePDF/template.ts` to understand how questions are currently used
  - [x] 4.3 Modify `infrastructure/lambda/generatePDF/index.ts` to: read questions from `event.arguments.input.RiskQuestions` instead of importing from `data.ts`; add validation that `RiskQuestions` is a non-empty array (throw if missing); map the input questions to the shape expected by `compileTemplate` (the same shape as the old `data.ts` export: `{ id: number, text: string, answers: [{ id: number, text: string }] }`)
  - [x] 4.4 Delete `infrastructure/lambda/generatePDF/data.ts`
  - [x] 4.5 Update `infrastructure/lambda/generatePDF/template.test.ts` if needed — check if tests import from `data.ts` or `__fixtures__/mockAnswers.ts` and update imports accordingly
  - [x] 4.6 Run `cd infrastructure && yarn test` to confirm all tests pass

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [x] 5.0 Update CDK stack with pipeline resolvers and new Lambda
  - [x] 5.1 Read current CDK AppSync pipeline resolver documentation using Context7 MCP to understand the correct CDK API for creating pipeline resolvers with JS resolver functions
  - [x] 5.2 Add the `getEvalueToken` Lambda to `infrastructure/lib/saltus-atr-stack.ts`: create a `NodejsFunction` with entry `lambda/getEvalueToken/index.ts`, env vars `SECRET_NAME` (`SALTUS-ATR-EVALUE-dev`) and `EVALUE_API_BASE_URL` (`https://api.evalueproduction.com`), runtime Node.js 22.x, 256MB, 30s timeout
  - [x] 5.3 Add IAM policy to the token Lambda granting `secretsmanager:GetSecretValue` scoped to `arn:aws:secretsmanager:eu-west-2:*:secret:SALTUS-ATR-EVALUE-*`
  - [x] 5.4 Add `EVALUE_API_BASE_URL` environment variable to the existing `getQuestions` and `calculateRisk` Lambdas
  - [x] 5.5 Create an AppSync data source for the `getEvalueToken` Lambda
  - [x] 5.6 Create `AppsyncFunction` objects for each Lambda data source (getEvalueToken, getQuestions, calculateRisk) with JS resolver request/response handlers that forward `ctx.prev.result` and `ctx.arguments`
  - [x] 5.7 Replace the existing `getQuestions` single Lambda resolver with a pipeline resolver chaining: getEvalueToken function -> getQuestions function
  - [x] 5.8 Replace the existing `calculateRisk` single Lambda resolver with a pipeline resolver chaining: getEvalueToken function -> calculateRisk function
  - [x] 5.9 Verify `generateRiskResultPDF` resolver is unchanged (remains a single Lambda resolver)
  - [x] 5.10 Run `cd infrastructure && npx tsc --noEmit` to confirm no TypeScript errors in the CDK stack

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [x] 6.0 Update frontend to pass questions to PDF mutation
  - [x] 6.1 Update `src/graphql/mutations.ts`: modify the `GENERATE_PDF` mutation query string to include `RiskQuestions` in the input, with nested `questionId`, `questionText`, and `responses` fields (`responseId`, `responseText`)
  - [x] 6.2 Update `src/pages/Results.tsx`: in `handleDownloadPdf`, add `RiskQuestions` to the mutation variables by mapping `state.questions` to the new input shape (`questionId: parseInt(q.id)`, `questionText: q.text`, `responses: q.answers.map(a => ({ responseId: parseInt(a.id), responseText: a.text }))`)
  - [x] 6.3 Run `yarn build` from the project root to confirm no TypeScript errors
  - [x] 6.4 Run `yarn test` from the project root to confirm no frontend test failures

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [x] 7.0 Final review and cleanup
  - [x] 7.1 Verify no remaining imports of deleted files (`data.ts`, `scoring.ts`) across the entire codebase using grep
  - [x] 7.2 Verify no hardcoded EValue URLs exist in Lambda code (all should use `EVALUE_API_BASE_URL` env var)
  - [x] 7.3 Run full test suite: `yarn test` (frontend) and `cd infrastructure && yarn test` (Lambdas)
  - [x] 7.4 Run `yarn build` to confirm production build succeeds
  - [x] 7.5 Security review: confirm no secrets/tokens in code, no client-side trust assumptions, all auth is server-side, Secrets Manager ARN is scoped (not wildcard)
  - [x] 7.6 Review all changes against the PRD requirements checklist (requirements 1-38) to confirm nothing was missed

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [x] 8.0 Generate review guide
  - [x] 8.1 Create `/tasks/review-guide-evalue-api-integration.md` using the Review Guide Template. Categorise all changes by area (Lambda functions, CDK infrastructure, GraphQL schema, frontend), list every file changed/created/deleted, and rank review priorities by risk and complexity.
  - [x] 8.2 Present the review guide summary to the user.
