# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React SPA for a 13-question attitude-to-risk questionnaire (EValue "5risk" system). The app is embedded via iframe on the Standard Life website, is fully anonymous (no auth/personal data), and calculates a risk rating 1–5 with a downloadable PDF report.

## Tech Stack

- **Frontend:** React 18.2, TypeScript 5.x, Create React App 5.0.1
- **Package manager:** Yarn 4.x (Berry)
- **Backend:** AWS AppSync (GraphQL, IAM auth), Lambda (Node.js 22.x, TypeScript)
- **Infrastructure:** AWS CDK (WAF, Cognito, PDF services) + Amplify CLI (AppSync, hosting)
- **Hosting:** S3 + CloudFront via Amplify
- **CI/CD:** Bitbucket Pipelines

## Common Commands

```bash
yarn start          # Dev server
yarn build          # Production build
yarn test           # Run tests (Jest)
yarn test -- --watchAll=false  # Run tests once (CI mode)
```

## Architecture

### State Management

React Context + `useReducer`. Key state shape:
- `questions` — fetched from EValue API
- `currentQuestion` — 1-based index
- `answers` — array of `{ questionId, responseId }`
- `riskRating` — integer 1–5
- `pdfUrl` — pre-signed S3 URL (120s expiry)

Reducer actions: `SET_QUESTIONS`, `SET_CURRENT_QUESTION`, `UPDATE_ANSWERS`, `SET_RISK_RATING`, `SET_RISK_RATING_DESCRIPTION`, `RESET_FORM`, `CREATE_PDF`, `RESET_CREATE_PDF`

### Routing (React Router DOM 6.x, BrowserRouter)

| Route | Component | Purpose |
|---|---|---|
| `/` | `QuestionnaireStart` | Landing with risk level info and CTA |
| `/questionnaire` | `Questionnaire` + `QuestionForm` | 13 questions, forward-only, progress bar |
| `/results` | `Results` | Risk rating, PDF download, retake |
| `/error` | `Error` | Technical error with back button |

### GraphQL API (AppSync)

- `Query.getQuestions` — fetches 13 questions from EValue
- `Mutation.calculateRisk(responses)` — submits answers, returns rating 1–5
- `Mutation.generateRiskResultPDF(input)` — generates PDF, returns pre-signed S3 URL

Uses Apollo Client 3.x with `aws-appsync-auth-link`. Cognito unauthenticated identity pool (no login).

### External API (EValue)

- OAuth2 token fetched fresh per request (no caching)
- Credentials stored in AWS Secrets Manager (`SLAL-RISK-UK-ADVISER-{env}`)
- `term: 15` always sent to calculateRisk endpoint
- Risk profile decimal is clamped to [1,5] and truncated via `parseInt()`

### PDF Generation

Lambda with Puppeteer-core + `@sparticuz/chromium` (2048MB, 300s timeout). Generates 3-page A4 PDF with Public Sans font. Stores `{uuid}_debug.html` alongside PDF in S3.

**Important:** The PDF Lambda uses a hardcoded copy of questions — must stay synchronized with EValue's live questions.

## Process Rules

- **Clean up servers:** When you start a dev server or any background process (e.g. for E2E tests), always kill it when you're done. Never leave stale servers running.
- **Each phase must be visually testable:** When building frontend features, always ensure the UI can be tested with real or mock data at every checkpoint — not just that it compiles. Set up mock data, stubs, or dev fixtures *before* building components so the UI is interactive and visually verifiable throughout development. At each checkpoint, run the dev server and use Playwright (or similar) to verify the UI renders correctly with data, not just that build/lint/test pass. The user should be able to `yarn dev` and manually inspect every page at any point.
- **Test-driven mindset:** Write or update tests before or alongside implementation, not as an afterthought. Unit tests for logic (reducers, scoring, utils), component tests for UI behaviour, and E2E verification against mock or real data at each milestone.

## Key Patterns & Conventions

- **Iframe messaging:** App posts height to parent window every 200ms via `postMessage` for dynamic iframe resizing
- **Forward-only navigation:** No back button in questionnaire; users retake from start
- **Ephemeral state:** Browser refresh on `/results` with empty state redirects to `/`
- **Cookie consent:** Analytics only fires when category 2 cookies accepted (`sl#cookiepreferences` cookie)
- **GTM:** `TagManager.initialize(...)` is commented out in `index.tsx`
- **UI libraries:** Ionic React 8.x, React Bootstrap 2.x, styled-components 5.x, Headless UI 2.x
- **Forms:** react-hook-form 7.x for questionnaire validation
- **PDF download:** Pre-signed URL fetched as blob via axios, saved via `file-saver`
- **Environment variables:** `REACT_APP_GTM_API_KEY`
