# Review Guide: EValue API Integration

## Summary

This feature replaces hardcoded questions and local risk scoring in Lambda functions with live calls to EValue's "5risk" API, using OAuth2 authentication via AWS Secrets Manager and AppSync pipeline resolvers.

The core architectural shift is from a self-contained system (hardcoded data, local scoring) to an API-driven one where EValue is the single source of truth for both questions and risk calculations. A new shared `getEvalueToken` Lambda handles OAuth2 auth, and AppSync pipeline resolvers chain the token step before each API call.

---

## Changes by Area

### 1. New Lambda: getEvalueToken

| File | Action | Description |
|------|--------|-------------|
| `infrastructure/lambda/getEvalueToken/index.ts` | CREATED | OAuth2 token Lambda: reads credentials from Secrets Manager, exchanges for bearer token via POST to EValue `/token` |
| `infrastructure/lambda/getEvalueToken/index.test.ts` | CREATED | 5 tests: success, SM failure, non-2xx, missing SECRET_NAME, missing EVALUE_API_BASE_URL |

**What to look for:**
- Secrets Manager client usage and error handling
- Basic auth header encoding (`base64(key:secret)`)
- Correct `grant_type=client_credentials` form body
- Bearer token extraction from response
- All env var validation paths

---

### 2. Modified Lambda: getQuestions

| File | Action | Description |
|------|--------|-------------|
| `infrastructure/lambda/getQuestions/index.ts` | REWRITTEN | Now calls EValue `getQuestionnaireData` API, transforms response fields |
| `infrastructure/lambda/getQuestions/index.test.ts` | CREATED | 4 tests: success + transform, string IDs, missing token, non-2xx |
| `infrastructure/lambda/getQuestions/data.ts` | DELETED | Hardcoded questions removed |

**What to look for:**
- Field transformation: EValue's response shape mapped to GraphQL `Question` type (`questionId` to `id` as string, etc.)
- Token received from pipeline resolver context (`ctx.prev.result`)
- No dangling imports to deleted `data.ts`

---

### 3. Modified Lambda: calculateRisk

| File | Action | Description |
|------|--------|-------------|
| `infrastructure/lambda/calculateRisk/index.ts` | REWRITTEN | Now calls EValue `calculateRisk` API with `questionnaireName:"5risk"` and `term:15`, clamps result to [1,5] |
| `infrastructure/lambda/calculateRisk/index.test.ts` | CREATED | 6 tests: success, clamp below, clamp above, decimal truncation, missing token, non-2xx |
| `infrastructure/lambda/calculateRisk/scoring.ts` | DELETED | Local scoring logic removed |
| `infrastructure/lambda/calculateRisk/scoring.test.ts` | DELETED | Old scoring tests removed |

**What to look for:**
- Clamping logic: `Math.max(1, Math.min(5, parseInt(...)))` -- verify edge cases
- String coercion of `questionId` and `responseId` before sending to EValue
- `term: 15` hardcoded correctly in request body
- `questionnaireName: "5risk"` sent correctly
- No dangling imports to deleted `scoring.ts`

---

### 4. Modified Lambda: generatePDF

| File | Action | Description |
|------|--------|-------------|
| `infrastructure/lambda/generatePDF/index.ts` | MODIFIED | Reads questions from `event.arguments.input.RiskQuestions` instead of importing `data.ts`. Validates non-empty array. Maps to template shape. |
| `infrastructure/lambda/generatePDF/data.ts` | DELETED | Hardcoded questions duplicate removed |
| `infrastructure/lambda/generatePDF/template.test.ts` | MODIFIED | Inline question data replaces deleted `data.ts` import |

**What to look for:**
- Questions mapped correctly from GraphQL input shape to PDF template shape
- Non-empty array validation (what happens if empty/undefined?)
- XSS protection via `escapeForJsString` still applied to dynamic question/response text
- No dangling imports to deleted `data.ts`

---

### 5. GraphQL Schema

| File | Action | Description |
|------|--------|-------------|
| `infrastructure/lib/schema.graphql` | MODIFIED | Added `RiskQuestionInput`, `RiskResponseInput` input types and `RiskQuestions: [RiskQuestionInput]!` field to `RiskResultPDFInput` |

**What to look for:**
- Input types match what the frontend sends (field names, types, nullability)
- Input types match what `generatePDF` Lambda expects to receive
- `!` (non-null) markers are correct -- `RiskQuestions` is required

---

### 6. CDK Infrastructure

| File | Action | Description |
|------|--------|-------------|
| `infrastructure/lib/saltus-atr-stack.ts` | MODIFIED | Major changes (see below) |

**Key changes:**
- Added `getEvalueToken` Lambda (256MB, 30s, Node.js 22.x) with `SECRET_NAME` and `EVALUE_API_BASE_URL` env vars
- Added IAM policy: `secretsmanager:GetSecretValue` scoped to `arn:aws:secretsmanager:${region}:${account}:secret:SALTUS-ATR-EVALUE-*`
- Added `EVALUE_API_BASE_URL` env var to `getQuestions` and `calculateRisk` Lambdas
- Created 3 AppSync data sources and 3 `AppsyncFunction` objects with JS resolver code
- Replaced single resolvers with pipeline resolvers: `getQuestions` = token -> questions, `calculateRisk` = token -> risk
- `generateRiskResultPDF` remains unchanged (single Lambda resolver)

**What to look for:**
- Pipeline resolver wiring: AppSync function code correctly forwards `ctx.prev.result` and `ctx.arguments`
- IAM policy scope is tight (wildcarded only on the secret name suffix, not `*`)
- Lambda memory/timeout appropriate (256MB/30s for token Lambda)
- Data source to Lambda mappings are correct (each function points to the right Lambda)
- Pipeline resolver ordering: token function is always first in the chain

---

### 7. Frontend

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Results.tsx` | MODIFIED | `handleDownloadPdf` now includes `RiskQuestions` in PDF mutation variables, mapping `state.questions` to GraphQL input shape (`parseInt` IDs, field name mapping) |
| `src/graphql/mutations.ts` | -- | No changes needed (Apollo sends full input object based on schema) |

**What to look for:**
- `parseInt` on question/response IDs (they're strings in state, numbers in GraphQL input)
- Field name mapping from internal state shape to `RiskQuestionInput`/`RiskResponseInput` schema
- Questions array is populated at the point `handleDownloadPdf` runs (not stale/empty)

---

### 8. Supporting Files

| File | Action | Description |
|------|--------|-------------|
| `infrastructure/scripts/preview-pdf-template.ts` | MODIFIED | Replaced broken import from deleted `data.ts` with inline question data |
| `infrastructure/package.json` | MODIFIED | Added `@aws-sdk/client-secrets-manager` dependency |

---

## Review Priority (by risk/complexity)

### High Priority

1. **CDK Stack** (`saltus-atr-stack.ts`) -- Pipeline resolver wiring is the riskiest change. Verify AppSync function code correctly forwards `ctx.prev.result` and `ctx.arguments`. Deployment creates new Lambda + IAM policy + rewires resolvers. A mistake here breaks all API calls.

2. **getEvalueToken Lambda** -- Core auth flow that every API call depends on. Verify Secrets Manager integration, Basic auth header encoding, error handling for all failure modes.

3. **calculateRisk Lambda** -- Verify clamping logic (`Math.max(1, Math.min(5, parseInt(...)))`), string coercion of `questionId`/`responseId`, `term: 15` hardcoded correctly. Incorrect clamping or truncation would silently return wrong risk ratings.

### Medium Priority

4. **getQuestions Lambda** -- Field transformation (`questionId` to `id` as string, etc.). Verify the transformed shape matches the GraphQL `Question` type exactly. Mismatches would break the frontend.

5. **generatePDF Lambda** -- Verify questions are correctly mapped from input to template shape. Check XSS protection via `escapeForJsString` is still applied to all dynamic content.

6. **GraphQL Schema** -- Verify input types match what frontend sends and what `generatePDF` expects. Schema mismatches cause silent failures.

### Lower Priority

7. **Frontend (Results.tsx)** -- Straightforward mapping of `state.questions` to mutation variables with `parseInt`. Low risk given schema validation.

8. **Tests** -- 15 new Lambda tests. Verify all are mocked correctly (no real API calls). Check coverage of edge cases.

9. **Deleted files** -- `data.ts` (x2), `scoring.ts`, `scoring.test.ts`. Verify no dangling imports remain anywhere in the codebase.

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **No token caching** | Fresh OAuth2 token per request. Matches original spec design. Simplicity over performance -- token requests are fast and avoid cache invalidation complexity. |
| **No retry logic** | Failures surface to user via error page. Keeps Lambda logic simple. Retries can be added later if EValue API proves flaky. |
| **Pipeline resolvers** | Token Lambda is a shared first step in `getQuestions` and `calculateRisk` pipelines, avoiding code duplication and keeping auth logic centralised. |
| **Questions passed frontend -> PDF** | Eliminates sync risk between hardcoded questions and EValue's live data. The frontend already has the questions in state, so passing them through to PDF generation is the cleanest approach. |
| **Native fetch** | Node.js 22.x has built-in `fetch`, so no external HTTP library (like `axios` or `node-fetch`) is needed in Lambda. Reduces bundle size and dependencies. |
| **Vitest v4 mocking** | Uses `vi.hoisted()` pattern for mock references in factory functions. This is the recommended approach for Vitest v4 to avoid hoisting issues with `vi.mock()`. |

---

## Pre-Deploy Checklist

- [ ] Create AWS Secrets Manager secret `SALTUS-ATR-EVALUE-dev` in `eu-west-2` with keys:
  - `EVALUE_CONSUMER_KEY`
  - `EVALUE_CONSUMER_SECRET`
- [ ] Deploy CDK stack:
  ```bash
  AWS_PROFILE=jr-dev npx cdk deploy SaltusAtrQuestionnaireStack
  ```
- [ ] Deploy frontend:
  ```bash
  AWS_PROFILE=jr-dev bash scripts/deploy-frontend.sh
  ```
- [ ] Smoke test: complete questionnaire end-to-end, verify risk rating displays, download PDF
- [ ] Verify CloudWatch logs show successful EValue API calls (no errors in `getEvalueToken`, `getQuestions`, `calculateRisk` log groups)
- [ ] Verify PDF contains correct questions and responses (not stale hardcoded data)

---

## Files Changed Summary

| Action | Count | Files |
|--------|-------|-------|
| Created | 4 | `getEvalueToken/index.ts`, `getEvalueToken/index.test.ts`, `getQuestions/index.test.ts`, `calculateRisk/index.test.ts` |
| Rewritten | 2 | `getQuestions/index.ts`, `calculateRisk/index.ts` |
| Modified | 6 | `generatePDF/index.ts`, `template.test.ts`, `schema.graphql`, `saltus-atr-stack.ts`, `Results.tsx`, `preview-pdf-template.ts` |
| Deleted | 4 | `getQuestions/data.ts`, `calculateRisk/scoring.ts`, `calculateRisk/scoring.test.ts`, `generatePDF/data.ts` |
| Dependency Added | 1 | `@aws-sdk/client-secrets-manager` in `infrastructure/package.json` |

**Total: ~17 files touched across 4 Lambdas, 1 CDK stack, 1 GraphQL schema, 1 frontend page, and 1 utility script.**
