# Tasks: Saltus ATR Questionnaire (Internal Demo)

> Generated from `tasks/prd-saltus-atr-questionnaire.md`

## Relevant Files

### Frontend — Config & Scaffolding
- `package.json` — Frontend dependencies and scripts
- `tsconfig.json` — TypeScript configuration
- `vite.config.ts` — Vite build configuration
- `index.html` — Vite HTML entry point with Google Fonts link
- `.env.example` — Template for environment variables (AppSync endpoint, Cognito pool ID, region)
- `.gitignore` — Git ignore rules for node_modules, dist, .env, etc.
- `src/index.css` — Tailwind CSS v4 directives and Saltus theme tokens (colours, fonts, radii, shadows)
- `src/main.tsx` — React DOM entry point, wraps App in providers
- `src/App.tsx` — Router setup with BrowserRouter and 4 routes
- `src/vite-env.d.ts` — Vite client type declarations

### Frontend — State Management & Types
- `src/context/types.ts` — TypeScript interfaces: Question, Answer, AppState, Action union type
- `src/context/questionnaireReducer.ts` — useReducer reducer with all 8 actions
- `src/context/questionnaireReducer.test.ts` — Unit tests for every reducer action and edge cases
- `src/context/QuestionnaireContext.tsx` — React Context provider and useQuestionnaire hook

### Frontend — GraphQL
- `src/graphql/client.ts` — Apollo Client setup with AppSync auth link + Cognito credentials
- `src/graphql/queries.ts` — getQuestions query
- `src/graphql/mutations.ts` — calculateRisk and generateRiskResultPDF mutations

### Frontend — Utilities & Hooks
- `src/utils/riskRatings.ts` — Risk rating map (1-5 → label + description)
- `src/utils/riskRatings.test.ts` — Tests for risk rating map lookups and edge cases
- `src/hooks/useIframeHeight.ts` — postMessage height resizing hook
- `src/hooks/useAnalytics.ts` — Stubbed GTM analytics (no-op functions)

### Frontend — Components
- `src/components/Layout.tsx` — Page wrapper: max-width 720px, centered, cream background, Roboto body
- `src/components/ProgressBar.tsx` — Segmented progress bar with ARIA attributes
- `src/components/ProgressBar.test.tsx` — Tests for progress bar rendering and ARIA
- `src/components/QuestionForm.tsx` — Fieldset/legend, radio buttons, Next/Submit button, react-hook-form validation
- `src/components/QuestionForm.test.tsx` — Tests for form validation, submission, radio selection
- `src/components/RiskLevelSelector.tsx` — Interactive radio group showing 5 risk levels with descriptions

### Frontend — Pages
- `src/pages/QuestionnaireStart.tsx` — Start page (`/`): risk level info, CTA button
- `src/pages/Questionnaire.tsx` — Questionnaire page (`/questionnaire`): fetches questions, renders progress bar + form
- `src/pages/Results.tsx` — Results page (`/results`): guard redirect, risk rating display, PDF download, retake
- `src/pages/Error.tsx` — Error page (`/error`): error message, back button

### Frontend — Assets
- `src/assets/risk-rating-1.svg` through `src/assets/risk-rating-5.svg` — Simple SVG graphics for each risk level

### Backend — CDK Infrastructure
- `infrastructure/package.json` — CDK dependencies
- `infrastructure/tsconfig.json` — TypeScript config for CDK
- `infrastructure/bin/app.ts` — CDK app entry point
- `infrastructure/lib/saltus-atr-stack.ts` — Single stack: S3, Cognito, AppSync, Lambdas, IAM roles

### Backend — Lambda: getQuestions
- `infrastructure/lambda/getQuestions/index.ts` — Handler returning hardcoded questions
- `infrastructure/lambda/getQuestions/data.ts` — Hardcoded 13 questions with answer options

### Backend — Lambda: calculateRisk
- `infrastructure/lambda/calculateRisk/index.ts` — Handler using scoring algorithm
- `infrastructure/lambda/calculateRisk/scoring.ts` — Weighted-average scoring logic
- `infrastructure/lambda/calculateRisk/scoring.test.ts` — Tests: all-high-risk answers → 5, all-low-risk → 1, mixed → 3, Q10 three-option handling, clamping

### Backend — Lambda: generatePDF
- `infrastructure/lambda/generatePDF/index.ts` — Handler: compile template, render PDF via Chromium, store in S3, return presigned URL
- `infrastructure/lambda/generatePDF/template.ts` — Saltus-branded 3-page A4 HTML template (lodash.template)
- `infrastructure/lambda/generatePDF/data.ts` — Hardcoded 13 questions (duplicate of getQuestions/data.ts, needed for PDF rendering)
- `infrastructure/lambda/generatePDF/s3Service.ts` — S3 helpers: storeTemplate, storeDocument, getDocumentUrl

### Review
- `tasks/review-guide-saltus-atr-questionnaire.md` — Final review guide

### Notes

- This is a greenfield project — the repo contains only docs, no source code yet
- Unit tests should be placed alongside the code files they test (e.g., `scoring.ts` and `scoring.test.ts`)
- Use `yarn test` to run tests. Use `yarn test [optional/path/to/test/file]` to run a specific test file
- Use `yarn build` to verify the frontend builds without errors
- CDK infrastructure uses a separate `package.json` in `infrastructure/`
- Lambda functions each have their own directory under `infrastructure/lambda/`

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

- [x] 0.0 Initialise repository and create feature branch
  - [x] 0.1 Run `git init` to initialise the repository
  - [x] 0.2 Create `.gitignore` with entries for: `node_modules/`, `dist/`, `.env`, `.env.local`, `cdk.out/`, `.DS_Store`, `*.js.map`, `coverage/`
  - [x] 0.3 Create and checkout a new branch: `git checkout -b feature/saltus-atr-questionnaire`

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [x] 1.0 Project scaffolding — Vite + React + TypeScript + Tailwind CSS v4 + Saltus theme
  - [x] 1.1 Initialise Yarn 4 (Berry): run `corepack enable && yarn init -2` in the project root. Set `nodeLinker: node-modules` in `.yarnrc.yml`
  - [x] 1.2 Scaffold a Vite + React + TypeScript project: create `package.json` with dependencies — `react`, `react-dom`, `typescript`, `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react`. Create `vite.config.ts` and `tsconfig.json`
  - [x] 1.3 Install frontend dependencies: `react-router-dom`, `@apollo/client`, `graphql`, `aws-appsync-auth-link`, `@aws-amplify/core`, `amazon-cognito-identity-js`, `react-hook-form`, `@headlessui/react`, `file-saver`, `@types/file-saver`, `axios`
  - [x] 1.4 Install dev dependencies: `tailwindcss@4`, `@tailwindcss/vite`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-react-hooks`
  - [x] 1.5 Create `vite.config.ts` with React plugin and Tailwind CSS v4 plugin. Add `test` config block for Vitest (environment: jsdom, globals: true, setupFiles)
  - [x] 1.6 Create `src/index.css` with Tailwind CSS v4 `@import "tailwindcss"` directive. Define Saltus theme tokens using `@theme`: colours (navy `#18263a`, dark-navy `#22384f`, blue `#325a7d`, cream `#fff5e6`, coral `#f0645a`, gold `#ec9f22`, teal `#9de6e4`, green `#49796b`, grey `#8c9097`, light-grey `#eeeeee`, divider `#dddddd`), font families (Georgia for headings, Roboto for body), border radii (card: 12px, input: 8px, pill: 9999px), box shadow (card: `0 1px 2.625px #00000014`)
  - [x] 1.7 Create `index.html` with Vite entry point (`<div id="root">`, `<script type="module" src="/src/main.tsx">`). Add Google Fonts `<link>` for Roboto (weights 300, 400, 500, 600, 700)
  - [x] 1.8 Create `src/main.tsx` — renders `<App />` into `#root` with `React.StrictMode`
  - [x] 1.9 Create `src/App.tsx` — placeholder that renders "Saltus ATR" text (routing added in task 2)
  - [x] 1.10 Create `src/vite-env.d.ts` with Vite client types reference
  - [x] 1.11 Create `.env.example` with placeholder values for `VITE_APPSYNC_ENDPOINT`, `VITE_APPSYNC_REGION`, `VITE_COGNITO_IDENTITY_POOL_ID`
  - [x] 1.12 Add scripts to `package.json`: `dev` (vite), `build` (tsc && vite build), `preview` (vite preview), `test` (vitest run), `test:watch` (vitest), `lint` (eslint src/)
  - [x] 1.13 Create a Vitest setup file (`src/test/setup.ts`) that imports `@testing-library/jest-dom`
  - [x] 1.14 Create ESLint config (`.eslintrc.cjs` or `eslint.config.js`) with TypeScript and React Hooks plugins
  - [x] 1.15 Run `yarn install`, then `yarn dev` — verify the app starts and shows the placeholder text in the browser
  - [x] 1.16 Run `yarn build` — verify it compiles without errors
  - [x] 1.17 Run `yarn lint` — verify no lint errors

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [x] 2.0 Frontend core — state management, routing, GraphQL client, types & utilities
  - [x] 2.1 Create `src/context/types.ts` — define TypeScript interfaces: `Question` (`id: string; text: string; answers: Answer[]`), `Answer` (`id: string; text: string`), `UserResponse` (`questionId: number; responseId: number`), `AppState` (questions, currentQuestion, answers, riskRating, riskRatingDescription, pdfUrl), and a discriminated union `Action` type for all 8 actions (`SET_QUESTIONS`, `SET_CURRENT_QUESTION`, `UPDATE_ANSWERS`, `SET_RISK_RATING`, `SET_RISK_RATING_DESCRIPTION`, `RESET_FORM`, `CREATE_PDF`, `RESET_CREATE_PDF`)
  - [x] 2.2 Create `src/utils/riskRatings.ts` — export a `riskRatings` map (Record<number, {label: string; description: string}>) for ratings 1-5 as defined in PRD section 4.8. Export a `getRiskRating(rating: number)` helper that returns the label and description for a given rating
  - [x] 2.3 Create `src/utils/riskRatings.test.ts` — test: each rating 1-5 returns correct label and description; out-of-range ratings (0, 6, -1) return undefined or a sensible fallback
  - [x] 2.4 Create `src/context/questionnaireReducer.ts` — implement the reducer function handling all 8 actions per PRD section 4.5. Initial state: `{ questions: [], currentQuestion: 1, answers: [], riskRating: undefined, riskRatingDescription: undefined, pdfUrl: '' }`. `SET_QUESTIONS` guards with `if (!state.questions) return state`. `RESET_FORM` keeps questions but resets currentQuestion to 1, answers to [], riskRating to undefined. `UPDATE_ANSWERS` appends to answers array. Default case returns state unchanged
  - [x] 2.5 Create `src/context/questionnaireReducer.test.ts` — test every action: `SET_QUESTIONS` sets questions, `SET_QUESTIONS` no-ops when `state.questions` is falsy (guard), `SET_CURRENT_QUESTION` updates index, `UPDATE_ANSWERS` appends answer, `SET_RISK_RATING` sets integer, `SET_RISK_RATING_DESCRIPTION` sets string, `RESET_FORM` resets answers/currentQuestion/riskRating but keeps questions, `CREATE_PDF` sets pdfUrl, `RESET_CREATE_PDF` clears pdfUrl, unknown action returns state unchanged
  - [x] 2.6 Create `src/context/QuestionnaireContext.tsx` — create React Context with `useReducer`. Export `QuestionnaireProvider` component (wraps children, provides state + dispatch) and a `useQuestionnaire()` hook that throws if used outside provider
  - [x] 2.7 Create `src/graphql/queries.ts` — define `GET_QUESTIONS` gql query: `query GetQuestions { getQuestions { id text answers { id text } } }`
  - [x] 2.8 Create `src/graphql/mutations.ts` — define `CALCULATE_RISK` mutation (`mutation CalculateRisk($responses: [Response]) { calculateRisk(responses: $responses) { rating } }`) and `GENERATE_PDF` mutation (`mutation GenerateRiskResultPDF($input: RiskResultPDFInput) { generateRiskResultPDF(input: $input) { url } }`)
  - [x] 2.9 Create `src/graphql/client.ts` — set up Apollo Client with AppSync HTTP link using `aws-appsync-auth-link` for IAM auth via Cognito unauthenticated identity pool. Read endpoint, region, and identity pool ID from `import.meta.env` variables. Export the configured `ApolloClient` instance. Include a TODO comment noting this requires deployed infrastructure to function
  - [x] 2.10 Create `src/hooks/useIframeHeight.ts` — implement the hook: on mount, start `setInterval(200ms)` that reads `document.documentElement.scrollHeight` and posts `['setHeight', height]` to `window.parent` via `postMessage('*')`. Clean up interval on unmount
  - [x] 2.11 Create `src/hooks/useAnalytics.ts` — export a `useAnalytics()` hook that returns a `trackEvent(action: string, label: string)` function. The function is a no-op (logs to console in dev mode only). Include a comment explaining this is stubbed for demo and can be wired to GTM later
  - [x] 2.12 Create `src/components/Layout.tsx` — wrapper component: sets `max-w-3xl mx-auto` (720px), `px-4 py-8`, cream background on `<body>` via useEffect or in index.css. Renders children inside a `<main>` element
  - [x] 2.13 Update `src/App.tsx` — add BrowserRouter, Routes for all 4 paths (`/` → QuestionnaireStart, `/questionnaire` → Questionnaire, `/results` → Results, `/error` → Error). Wrap in `QuestionnaireProvider` and `ApolloProvider`. Call `useIframeHeight()` at the App level. For now, create placeholder page components that render their route name
  - [x] 2.14 Update `src/main.tsx` — import `index.css`
  - [x] 2.15 Create 5 simple SVG files in `src/assets/` (`risk-rating-1.svg` through `risk-rating-5.svg`): each is a simple gauge/meter graphic using Saltus colours — teal fill proportional to the rating level (1=20%, 2=40%, 3=60%, 4=80%, 5=100%), navy text showing the number, on a light grey background arc
  - [x] 2.16 Run `yarn test` — verify reducer and risk ratings tests pass
  - [x] 2.17 Run `yarn build` — verify no type errors
  - [x] 2.18 Run `yarn lint` — verify no lint errors

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [ ] 3.0 Frontend pages & components — Start, Questionnaire, Results, Error + shared components
  - [ ] 3.1 Create `src/components/RiskLevelSelector.tsx` — Headless UI `RadioGroup` with 5 options (rating 1-5). Each option shows the label (e.g. "Lower") and description from the risk ratings map. Selected state uses teal background (`bg-teal`), unselected uses white with divider border. Styled as a vertical stack of cards with 12px border radius, Roboto font. Keyboard accessible (arrow keys to navigate, space/enter to select)
  - [ ] 3.2 Create `src/components/ProgressBar.tsx` — accepts `currentStep` and `totalSteps` props. Renders a horizontal flex row of `totalSteps` segments. Completed segments (< currentStep) are green `#49796b`, current segment is teal `#9de6e4`, future segments are light grey `#eeeeee`. Below the bar: "Question {currentStep} of {totalSteps}" in grey text. Add `role="progressbar"`, `aria-valuemin={1}`, `aria-valuemax={totalSteps}`, `aria-valuenow={currentStep}`, `aria-label="Question progress"`
  - [ ] 3.3 Create `src/components/ProgressBar.test.tsx` — test: renders correct number of segments; current segment has teal styling; completed segments have green styling; future segments have grey styling; ARIA attributes are correct; label text shows "Question N of M"
  - [ ] 3.4 Create `src/components/QuestionForm.tsx` — accepts `question: Question`, `onSubmit: (responseId: number) => void`, `isLastQuestion: boolean` props. Uses react-hook-form. Renders `<fieldset>` with `<legend>` containing question text (Georgia font, navy colour). Radio buttons for each answer (Roboto, 16px, 44px min tap target). Submit button reads "Next" or "Submit" (isLastQuestion). Validates that an answer is selected (shows error if not). On submit, calls `onSubmit(selectedAnswerId)` and resets form. Radio buttons styled as card-like options with border, 8px radius, teal highlight on selection
  - [ ] 3.5 Create `src/components/QuestionForm.test.tsx` — test: renders question text in legend; renders all answer options as radio buttons; submit without selection shows validation error; selecting answer + submit calls onSubmit with correct responseId; button says "Next" when `isLastQuestion=false`, "Submit" when `isLastQuestion=true`; form resets after submission
  - [ ] 3.6 Create `src/pages/QuestionnaireStart.tsx` — implement per PRD section 4.1. Layout: H2 "Check your attitude to risk" (Georgia, navy), explanatory paragraph (Roboto, grey), `<RiskLevelSelector>` (read-only, informational — no state binding needed), disclaimer paragraph, H2 "Take the questionnaire" with "13 multiple choice questions, less than 5 minutes" text, info alert box "We don't store your data" (teal-100 background, navy text, 12px radius), CTA button "I'm ready to start" (navy background pill button, white text). On click: dispatch `RESET_FORM`, navigate to `/questionnaire`
  - [ ] 3.7 Create `src/pages/Questionnaire.tsx` — implement per PRD section 4.2. On mount: execute `GET_QUESTIONS` query via Apollo (fetchPolicy: 'no-cache'). On success: dispatch `SET_QUESTIONS`. On error: navigate to `/error`. Render: H2 "Your attitude to risk", `<ProgressBar>` with currentQuestion and questions.length, `<QuestionForm>` for `questions[currentQuestion - 1]`. QuestionForm onSubmit handler: dispatch `UPDATE_ANSWERS` with `{ questionId: currentQuestion, responseId }` (both as integers), dispatch `SET_CURRENT_QUESTION` with `Math.min(currentQuestion + 1, questions.length)`. When `answers.length === questions.length`: navigate to `/results`. Show loading spinner/skeleton while questions are fetching
  - [ ] 3.8 Create `src/pages/Results.tsx` — implement per PRD section 4.3. Guard: if `questions.length === 0`, redirect to `/` via `useEffect` + `navigate('/', { replace: true })`. On mount (when answers.length === questions.length and no riskRating yet): call `CALCULATE_RISK` mutation with `{ responses: answers }`. On success: dispatch `SET_RISK_RATING`, look up description via `getRiskRating()`, dispatch `SET_RISK_RATING_DESCRIPTION`. On error: navigate to `/error`. Render: risk rating SVG image (import from assets), H2 "Your risk level is {label}" (Georgia, navy), description paragraph (Roboto, grey). "Retake the test" button (outline style, navy border pill): dispatches `RESET_FORM` + `RESET_CREATE_PDF`, navigates to `/questionnaire`. H2 "Next Steps", card (white bg, 12px radius, card shadow) with "Download the results and email to your adviser" text. "Download PDF" button (teal bg pill, navy text): calls `GENERATE_PDF` mutation, fetches blob via axios, triggers download via file-saver as `risk-results.pdf`. While loading: button shows "Downloading PDF..." and is disabled. Show loading state while risk rating is being calculated
  - [ ] 3.9 Create `src/pages/Error.tsx` — implement per PRD section 4.4. Render: error icon or illustration, H2 "Something went wrong" (Georgia, navy), message paragraph "Apologies we're experiencing some technical issues. Please try again later." (Roboto, grey). "Back" button (primary navy pill): dispatches `RESET_FORM` and `SET_QUESTIONS` with empty array, navigates to `/`
  - [ ] 3.10 Remove placeholder page components from `src/App.tsx` and import the real page components
  - [ ] 3.11 Review all pages for accessibility: ensure all interactive elements are keyboard focusable, all images have alt text, heading hierarchy is correct (h2s only, no skipped levels), colour contrast meets AA (navy on cream = 12.5:1, navy on white = 14.5:1 — both pass)
  - [ ] 3.12 Run `yarn test` — verify all component and page tests pass
  - [ ] 3.13 Run `yarn build` — verify no type errors
  - [ ] 3.14 Run `yarn lint` — verify no lint errors
  - [ ] 3.15 Run `yarn dev` and manually test the frontend flow end-to-end using the browser. Pages will not have real data (GraphQL calls will fail without backend), but verify: start page renders correctly, clicking CTA navigates to `/questionnaire`, error page renders and "Back" returns to `/`, direct navigation to `/results` redirects to `/`

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [ ] 4.0 CDK infrastructure & backend Lambdas — AppSync, Cognito, S3, getQuestions, calculateRisk
  - [ ] 4.1 Create `infrastructure/` directory. Initialise a separate `package.json` with CDK dependencies: `aws-cdk-lib`, `constructs`, `@aws-cdk/aws-appsync-alpha` (or `aws-cdk-lib/aws-appsync`), `typescript`, `ts-node`, `esbuild`. Create `tsconfig.json` for the CDK project (target ES2022, module commonjs)
  - [ ] 4.2 Create `infrastructure/bin/app.ts` — CDK app entry point. Instantiate the `SaltusAtrStack` with env from `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` (default to `eu-west-2`)
  - [ ] 4.3 Create `infrastructure/lambda/getQuestions/data.ts` — export the hardcoded 13 questions as a typed array. Each question has `id` (number 1-13), `text` (question string), and `answers` (array of `{ id: number, text: string }` with IDs 1-5, or 1-3 for Q10). Data exactly matches PRD section 4.14
  - [ ] 4.4 Create `infrastructure/lambda/getQuestions/index.ts` — Lambda handler. Import questions from `data.ts`. Transform each to `{ id: String(q.id), text: q.text, answers: q.answers.map(a => ({ id: String(a.id), text: a.text })) }`. Return the array. Wrap in try/catch — on error, log and throw a user-friendly error message
  - [ ] 4.5 Create `infrastructure/lambda/calculateRisk/scoring.ts` — export a `calculateRiskScore(responses: Array<{questionId: string; responseId: string}>): number` function. Implements the scoring algorithm from PRD section 4.15: forward-scored questions (Q1,Q2,Q3,Q4,Q6,Q7,Q8) map responseId 1→5, 2→4, 3→3, 4→2, 5→1. Reverse-scored questions (Q5,Q11,Q13) map responseId 1→1, 2→2, 3→3, 4→4, 5→5. Q9: 1→1, 2→2, 3→3, 4→4, 5→5. Q10 (3 options): 1→1, 2→5, 3→3. Q12: 1→5, 2→4, 3→3, 4→2, 5→1. Average all 13 scores, `Math.round()`, clamp to [1,5]
  - [ ] 4.6 Create `infrastructure/lambda/calculateRisk/scoring.test.ts` — test cases: all first-answers selected → expected rating; all last-answers selected → expected rating; mixed middle answers → rating 3; Q10 with only 3 options handled correctly; result is always an integer between 1 and 5; single-question edge case doesn't crash (even though real app always sends 13)
  - [ ] 4.7 Create `infrastructure/lambda/calculateRisk/index.ts` — Lambda handler. Extract `responses` from `event.arguments.responses`. Call `calculateRiskScore(responses)`. Return `{ rating }`. Wrap in try/catch — on error, log and throw
  - [ ] 4.8 Create `infrastructure/lib/saltus-atr-stack.ts` — single CDK Stack containing:
    - S3 bucket (`SaltusATRPDFStore-{env}`): `blockPublicAccess: BlockPublicAccess.BLOCK_ALL`, `encryption: BucketEncryption.S3_MANAGED`
    - Cognito Identity Pool: `allowUnauthenticatedIdentities: true`, create an unauthenticated IAM role with AppSync invoke permissions
    - AppSync GraphQL API: `authorizationConfig` with IAM as default auth. Load schema from a `schema.graphql` file. Create Lambda data sources and resolvers for `getQuestions` (Query), `calculateRisk` (Mutation) — wire each to its respective Lambda function
    - Lambda functions for `getQuestions` and `calculateRisk`: Node.js 22.x runtime, bundled with esbuild via `NodejsFunction`, 256MB memory, 30s timeout
    - CDK Outputs: AppSync endpoint URL, AppSync region, Cognito Identity Pool ID (these are the values the frontend needs in `.env`)
  - [ ] 4.9 Create `infrastructure/lib/schema.graphql` — the GraphQL schema from PRD section 4.9 (without `@function` directives — CDK wires resolvers separately)
  - [ ] 4.10 Run scoring tests: `cd infrastructure && npx vitest run` (or set up a test script in infrastructure/package.json)
  - [ ] 4.11 Run `cd infrastructure && npx cdk synth` — verify the CDK stack synthesises without errors. Do NOT deploy yet (that happens in task 6)

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [ ] 5.0 PDF generation Lambda & Saltus-branded HTML template
  - [ ] 5.1 Create `infrastructure/lambda/generatePDF/data.ts` — copy the same 13 questions from `getQuestions/data.ts` (the PDF needs all answer options to render radio-button-style lists). Add a comment noting this must stay in sync with `getQuestions/data.ts`
  - [ ] 5.2 Create `infrastructure/lambda/generatePDF/s3Service.ts` — S3 client with 3-second connection timeout. Export three functions: `storeTemplate(bucket, filename, body)` (PutObject, ContentDisposition: 'inline'), `storeDocument(bucket, filename, body)` (PutObject, ContentType: 'application/pdf', ContentDisposition: 'inline'), `getDocumentUrl(bucket, filename)` (presigned GET URL, 120s expiry). Use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
  - [ ] 5.3 Create `infrastructure/lambda/generatePDF/template.ts` — export a function `compileTemplate(params: { RiskRating: string, RiskQuestionsString: string, RiskAnswersString: string, date: string }): string` that returns a complete HTML document string. Use lodash.template. The HTML structure:
    - `<head>`: charset UTF-8, Google Fonts link (Georgia not needed as system font, Roboto weights 300/400/700), CSS variables for Saltus colours (navy, teal, cream, coral, grey, etc.), print-optimised styles
    - **Page 1**: Teal top border (4px), H1 "Risk Profile Results" (#18263a), grey box (#eeeeee background) with left-side risk rating display and right-side "Your attitude to risk is {label}" + description text, info box "Please email this document to your Financial Adviser" (teal left border, light teal background), teal bottom border
    - **Page 2**: Header "Risk Profiler Report" (navy), H3 "Your questions and answers:", H5 "Risk Questionnaire:", ordered list (start=1) of questions 1-7, each with all answer options as styled radio circles, user's selected answer shown as filled teal circle
    - **Page 3**: Same header, H3 "Your questions and answers (continued)", ordered list (start=8) of questions 8-13, same radio-button format
    - JavaScript block at the bottom that parses the injected JSON strings, iterates questions, builds the radio-button HTML, and injects into `.first-section` and `.second-section` containers
  - [ ] 5.4 Create `infrastructure/lambda/generatePDF/index.ts` — Lambda handler:
    1. Generate UUID via `crypto.randomUUID()`
    2. Extract `RiskRating` and `RiskAnswers` from `event.arguments.input`
    3. Import hardcoded questions from `data.ts`, serialise to JSON string
    4. Serialise `RiskAnswers` to JSON string
    5. HTML-encode both strings (replace `'` → `&#39;`, `"` → `\\"`)
    6. Get current date as dd/mm/yyyy (en-GB locale)
    7. Compile template via `compileTemplate()`
    8. Store debug HTML as `{uuid}_debug.html` in S3 via `storeTemplate()`
    9. Launch headless Chromium via `@sparticuz/chromium` and `puppeteer-core`
    10. Set page content to compiled HTML, wait for network idle
    11. Generate PDF: format A4, margins 1 inch all sides, `printBackground: true`
    12. Store PDF in S3 via `storeDocument()`
    13. Generate presigned URL via `getDocumentUrl()`
    14. Return `{ url }`
    15. Wrap entire handler in try/catch — log errors, throw user-friendly message
  - [ ] 5.5 Add PDF Lambda to CDK stack in `saltus-atr-stack.ts`:
    - Create a Lambda Layer for `@sparticuz/chromium` (download the prebuilt layer zip from the chromium package, or use a bundled approach)
    - Create `generateRiskResultPDFSaltusATR` Lambda: Node.js 22.x, 2048MB memory, 300s timeout, bundled with esbuild via `NodejsFunction`, attach the Chromium layer, grant S3 read/write permissions to the PDF bucket, set `PDF_BUCKET_NAME` environment variable
    - Add AppSync resolver for `generateRiskResultPDF` mutation wired to this Lambda
  - [ ] 5.6 Run `cd infrastructure && npx cdk synth` — verify the updated stack synthesises without errors
  - [ ] 5.7 Review the HTML template for correctness: verify all 3 pages would render, colours match Saltus palette, fonts are correct, JavaScript logic correctly maps answers to questions

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [ ] 6.0 Frontend-backend integration, deployment & end-to-end verification
  - [ ] 6.1 Deploy CDK stack: `cd infrastructure && npx cdk deploy --require-approval never`. Record the outputs: AppSync endpoint URL, region, Cognito Identity Pool ID
  - [ ] 6.2 Create `src/.env.local` (gitignored) with the real values from CDK outputs: `VITE_APPSYNC_ENDPOINT=<url>`, `VITE_APPSYNC_REGION=<region>`, `VITE_COGNITO_IDENTITY_POOL_ID=<pool-id>`
  - [ ] 6.3 Run `yarn dev` and test the full end-to-end flow in the browser:
    - Start page renders with all content, risk level selector is interactive
    - Click "I'm ready to start" → navigates to `/questionnaire`
    - Questions load from the backend (13 questions appear)
    - Progress bar advances correctly with each answered question
    - Radio selection works, "Next" button submits and advances
    - After question 13, "Submit" button navigates to `/results`
    - Results page shows correct risk rating with label and description
    - "Retake the test" resets and returns to questionnaire
  - [ ] 6.4 Test PDF download:
    - Click "Download PDF" on results page
    - Button shows "Downloading PDF..." loading state
    - PDF downloads as `risk-results.pdf`
    - Open PDF: verify 3 pages, Saltus branding (navy headers, teal accents, Roboto font), correct risk rating, all 13 questions with the user's selected answers checked
  - [ ] 6.5 Test error handling:
    - Temporarily break the AppSync endpoint in `.env.local` → verify app navigates to `/error` page
    - Verify "Back" button on error page returns to `/`
    - Restore correct endpoint
  - [ ] 6.6 Test edge cases:
    - Navigate directly to `/results` in a fresh browser tab → verify redirect to `/`
    - Navigate directly to `/questionnaire` → verify questions load (or redirect if appropriate)
    - Refresh browser on `/questionnaire` mid-flow → verify graceful handling
  - [ ] 6.7 Test iframe embedding: create a simple HTML file that embeds the app in an iframe (`<iframe src="http://localhost:5173" width="800">`). Verify the iframe resizes dynamically as content changes (postMessage height updates). Verify no double scrollbars
  - [ ] 6.8 Run `yarn build` — verify production build succeeds
  - [ ] 6.9 Deploy frontend: either via Amplify hosting or by uploading `dist/` to an S3 bucket with CloudFront. Record the public URL
  - [ ] 6.10 Test the deployed app at the public URL — repeat the end-to-end flow from 6.3 and 6.4 against the production build
  - [ ] 6.11 Run a final accessibility check: use browser dev tools (Lighthouse or axe-core extension) on all 4 pages. Fix any critical or serious violations. Verify keyboard navigation through the entire questionnaire flow

> **CHECKPOINT: Stop here.** Verify (build/lint/test), summarise what was implemented, list assumptions + failure modes + production risks, and **wait for explicit user approval** before continuing.

---

- [ ] 7.0 Generate review guide
  - [ ] 7.1 Create `tasks/review-guide-saltus-atr-questionnaire.md` using the Review Guide Template. Categorise all changes by area (scaffolding, state management, components, pages, CDK infrastructure, Lambda functions, PDF generation). List every file created. Rank review priorities by risk and complexity (PDF Lambda and CDK stack = high priority; static pages = low priority)
  - [ ] 7.2 Present the review guide summary to the user
