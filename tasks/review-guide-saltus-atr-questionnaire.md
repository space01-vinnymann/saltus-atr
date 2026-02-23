# Review Guide: Saltus ATR Questionnaire

> Internal demo — React SPA + AWS CDK backend for a 13-question Attitude to Risk profiler with PDF report generation.

---

## Architecture Overview

```
Browser (React SPA)
  │
  ├── Apollo Client (SigV4-signed IAM auth)
  │
  └── AWS AppSync (GraphQL API)
        ├── getQuestions     → Lambda → hardcoded 13 questions
        ├── calculateRisk    → Lambda → weighted-average scoring → rating 1-5
        └── generateRiskResultPDF → Lambda → Chromium PDF → S3 → presigned URL
```

**Auth flow**: Cognito Identity Pool (unauthenticated) → temporary AWS credentials → SigV4-signed AppSync requests.

---

## Files Created

### 1. Config & Scaffolding (Low Priority)

| File | Purpose |
|---|---|
| `package.json` | Frontend deps: React 18, Apollo Client 4, Headless UI 2, Tailwind CSS 4 |
| `tsconfig.json` | Strict mode, ES2020, bundler resolution |
| `vite.config.ts` | React + Tailwind plugins, Vitest config |
| `eslint.config.js` | ESLint 9 flat config with TS + React Hooks |
| `index.html` | Vite entry point, Google Fonts Roboto |
| `.env.example` | Template for AppSync/Cognito env vars |
| `.gitignore` | Standard ignores + cdk.out, .env |
| `src/index.css` | Tailwind v4 `@theme` with Saltus design tokens |
| `src/main.tsx` | React DOM entry |
| `src/vite-env.d.ts` | Vite type declarations |
| `src/test/setup.ts` | Testing Library jest-dom setup |

### 2. State Management & Types (Medium Priority)

| File | Purpose | Tests |
|---|---|---|
| `src/context/types.ts` | TypeScript interfaces: Question, Answer, AppState, 8-action union | — |
| `src/context/questionnaireReducer.ts` | useReducer with all 8 actions | 10 tests |
| `src/context/QuestionnaireContext.tsx` | Provider + `useQuestionnaire` hook | — |
| `src/utils/riskRatings.ts` | Rating 1-5 → label + description map | 12 tests |

### 3. GraphQL & API Client (High Priority)

| File | Purpose | Tests |
|---|---|---|
| `src/graphql/client.ts` | Apollo Client with custom SigV4 signing via `@smithy/signature-v4` | — |
| `src/graphql/queries.ts` | `GET_QUESTIONS` query | — |
| `src/graphql/mutations.ts` | `CALCULATE_RISK` + `GENERATE_PDF` mutations | — |
| `src/graphql/mockData.ts` | 13 questions + mock scoring for local dev | — |
| `src/graphql/mockLink.ts` | Mock Apollo Link (used when no endpoint configured) | — |

**Review focus**: `client.ts` contains the custom SigV4 signing implementation that replaced the broken `aws-appsync-auth-link` library. Verify the signing approach is correct and credentials aren't leaked.

### 4. Components (Medium Priority)

| File | Purpose | Tests |
|---|---|---|
| `src/components/Layout.tsx` | Page wrapper: max-w-3xl, cream bg | — |
| `src/components/ProgressBar.tsx` | Segmented bar with ARIA progressbar | 6 tests |
| `src/components/QuestionForm.tsx` | react-hook-form radio buttons, validation | 7 tests |
| `src/components/RiskLevelSelector.tsx` | Headless UI v2 RadioGroup, 5 risk levels | — |

### 5. Pages (Medium Priority)

| File | Purpose |
|---|---|
| `src/pages/QuestionnaireStart.tsx` | Start page: risk level info, CTA |
| `src/pages/Questionnaire.tsx` | Fetches questions, progress bar, form loop |
| `src/pages/Results.tsx` | Risk calculation, SVG display, PDF download |
| `src/pages/Error.tsx` | Error message with back button |
| `src/App.tsx` | Router setup, providers |

**Review focus**: `Results.tsx` handles risk calculation mutation, PDF generation mutation, and file download. Check error handling paths.

### 6. Assets (Low Priority)

| File | Purpose |
|---|---|
| `src/assets/risk-rating-1.svg` through `risk-rating-5.svg` | Gauge SVGs for each risk level |

### 7. CDK Infrastructure (High Priority)

| File | Purpose |
|---|---|
| `infrastructure/package.json` | CDK deps + Lambda runtime deps |
| `infrastructure/tsconfig.json` | ES2022, commonjs |
| `infrastructure/cdk.json` | CDK app config |
| `infrastructure/bin/app.ts` | CDK app entry, defaults eu-west-2 |
| `infrastructure/lib/saltus-atr-stack.ts` | **Full stack**: S3, Cognito, AppSync, 3 Lambdas, IAM |
| `infrastructure/lib/schema.graphql` | GraphQL schema (Query, Mutation, types, inputs) |

**Review focus**: `saltus-atr-stack.ts` is the most critical file. Check:
- Cognito unauthenticated role permissions (should only allow `appsync:GraphQL`)
- S3 bucket is BLOCK_ALL with CORS for GET only
- Lambda memory/timeout settings (PDF Lambda: 2048MB, 300s)
- No overly permissive IAM policies

### 8. Lambda: getQuestions (Low Priority)

| File | Purpose |
|---|---|
| `infrastructure/lambda/getQuestions/data.ts` | 13 hardcoded questions |
| `infrastructure/lambda/getQuestions/index.ts` | Returns questions with string IDs |

### 9. Lambda: calculateRisk (High Priority)

| File | Purpose | Tests |
|---|---|---|
| `infrastructure/lambda/calculateRisk/scoring.ts` | Weighted-average scoring algorithm | 7 tests |
| `infrastructure/lambda/calculateRisk/index.ts` | Handler: extract responses, return rating | — |

**Review focus**: Scoring algorithm implements forward/reverse scoring per PRD. Q10 has 3 options (not 5). Q12 is forward-scored. Verify the scoring matches the PRD specification in section 4.15.

### 10. Lambda: generatePDF (High Priority)

| File | Purpose |
|---|---|
| `infrastructure/lambda/generatePDF/data.ts` | Copy of 13 questions (must stay in sync with getQuestions) |
| `infrastructure/lambda/generatePDF/s3Service.ts` | S3 helpers: store template, store PDF, get presigned URL |
| `infrastructure/lambda/generatePDF/template.ts` | 3-page A4 HTML template with Saltus branding |
| `infrastructure/lambda/generatePDF/index.ts` | Handler: compile template, Chromium PDF, S3, presigned URL |

**Review focus**: Template uses lodash.template with inline JavaScript to render radio-button answer grids. Verify the JS logic correctly maps answers to questions across pages 2-3. Check that HTML-encoding in `index.ts` prevents injection.

---

## Review Priority Ranking

| Priority | Area | Risk | Reason |
|---|---|---|---|
| 1 (Critical) | CDK Stack | High | IAM permissions, Cognito unauth access, infrastructure security |
| 2 (Critical) | GraphQL Client (SigV4) | High | Custom crypto signing, credential handling |
| 3 (High) | PDF Lambda | Medium-High | Chromium in Lambda, S3 presigned URLs, HTML injection surface |
| 4 (High) | Scoring Algorithm | Medium | Business logic correctness, must match PRD exactly |
| 5 (Medium) | Results Page | Medium | Mutation orchestration, file download, error handling |
| 6 (Medium) | State Management | Low-Medium | Reducer correctness, well-tested |
| 7 (Low) | Components | Low | UI-only, tested |
| 8 (Low) | Static Pages | Low | Presentational, no business logic |
| 9 (Low) | Config/Scaffolding | Low | Standard boilerplate |

---

## Test Coverage

| Suite | Tests | File |
|---|---|---|
| Scoring algorithm | 7 | `infrastructure/lambda/calculateRisk/scoring.test.ts` |
| Questionnaire reducer | 10 | `src/context/questionnaireReducer.test.ts` |
| Risk ratings map | 12 | `src/utils/riskRatings.test.ts` |
| Progress bar | 6 | `src/components/ProgressBar.test.tsx` |
| Question form | 7 | `src/components/QuestionForm.test.tsx` |
| **Total** | **42** | |

**Not unit-tested** (tested via E2E instead):
- GraphQL client (SigV4 signing) — verified via live AppSync calls
- PDF Lambda handler — verified via live PDF download
- Pages — verified via Playwright E2E automation

---

## Known Issues & Technical Debt

1. **Duplicate question data** — `generatePDF/data.ts` is a manual copy of `getQuestions/data.ts`. Should be a shared module.
2. **Bundle size** — 606KB (197KB gzipped). AWS SDK contributes significantly. Could be reduced with code splitting.
3. **No rate limiting** — Unauthenticated Cognito users can invoke the API without restriction.
4. **Debug HTML in S3** — The PDF Lambda stores `{uuid}_debug.html` alongside PDFs. Should be removed for production.
5. **No frontend hosting** — App runs locally via `yarn dev`. Production deployment needs S3+CloudFront or Amplify.
6. **`aws-appsync-auth-link` removed** — Replaced with custom SigV4 signing due to Node.js `url.parse` incompatibility in Vite. The custom implementation is simpler but less battle-tested.

---

## Key Decisions Made

| Decision | Rationale |
|---|---|
| Custom SigV4 signing over `aws-appsync-auth-link` | Library uses Node.js `url.parse`, breaks in Vite browser builds |
| Mock GraphQL link for local dev | Frontend can be developed and tested without deployed backend |
| `@sparticuz/chromium` bundled via `nodeModules` | Simpler than a Lambda Layer, stays within Lambda size limits |
| Inline PDF error (not /error page) | PDF download failure shouldn't lose the user's results |
| S3 CORS `*` origins for GET | Presigned URLs are already authenticated; CORS origin restriction adds no security |
| Headless UI v2 `Radio` component | v1 `RadioGroup.Option` API deprecated; v2 uses `data-checked:` Tailwind v4 classes |

---

## How to Run

```bash
# Frontend
yarn install
yarn dev          # Start dev server (uses mock data if no .env.local)
yarn build        # Production build
yarn test         # Run 42 unit tests
yarn lint         # ESLint check

# Infrastructure
cd infrastructure
npm install
npx vitest run    # Run 7 scoring tests
npx cdk synth     # Synthesise CloudFormation
npx cdk deploy    # Deploy to AWS (requires credentials)
```

## Environment Variables

```
VITE_APPSYNC_ENDPOINT=https://xxx.appsync-api.eu-west-2.amazonaws.com/graphql
VITE_APPSYNC_REGION=eu-west-2
VITE_COGNITO_IDENTITY_POOL_ID=eu-west-2:xxx-xxx-xxx
```

If `VITE_APPSYNC_ENDPOINT` is not set, the app automatically uses mock data for local development.
