# PRD: Saltus Attitude-to-Risk Questionnaire (Internal Demo)

## 1. Introduction / Overview

Build a Saltus-branded attitude-to-risk questionnaire app for **internal demo purposes**. The app presents a 13-question risk profiler (based on the EValue "5risk" format), calculates a risk rating (1-5), displays results, and generates a downloadable PDF report. The app is anonymous — no user authentication or personal data is collected.

This is **not** connecting to real EValue APIs or Saltus infrastructure. The EValue API is fully mocked in the backend Lambdas — questions are hardcoded and risk calculation uses a simple scoring algorithm. Infrastructure is deployed to the developer's own AWS account. We mock EValue rather than integrating with it because the demo needs to be deployable to any developer AWS account with zero prerequisites — no API keys, no OAuth credentials, no Secrets Manager entries. This keeps the setup to a single `cdk deploy`.

The frontend uses a modern stack (Vite, Tailwind CSS v4, Headless UI) with Saltus branding (navy/teal/coral palette, Georgia headings, Roboto body text). The original app used CRA + Ionic + React Bootstrap + styled-components — three overlapping styling systems. We consolidated to Tailwind v4 + Headless UI because it's fewer dependencies, a single styling approach, and maps cleanly to the Saltus design tokens. All user-facing copy is taken from the original Standard Life spec with "Standard Life" replaced by "Saltus".

**Reference:** The original application spec is in `docs/APPLICATION_SPEC.md`. The Saltus design system is captured in `docs/saltus-website.pen`.

## 2. Goals

1. Deliver a visually polished, fully functional ATR questionnaire demo with Saltus branding
2. Modernise the frontend stack to Vite + React 18 + TypeScript + Tailwind CSS v4
3. Build a working AWS backend (AppSync, Lambda functions, CDK) with mocked EValue responses — no real API keys or secrets required
4. Support both standalone page rendering and iframe embedding with dynamic height resizing
5. Generate a Saltus-branded 3-page A4 PDF report downloadable by the user
6. Maintain good accessibility (keyboard navigation, semantic HTML, ARIA attributes)

## 3. User Stories

### Happy Path

- **US-1:** As a user, I can land on the start page and read an explanation of the risk profiler, see interactive risk level descriptions (1-5), and click "I'm ready to start" to begin the questionnaire.
- **US-2:** As a user, I can answer 13 multiple-choice questions one at a time, see my progress via a segmented progress bar ("Question N of 13"), and advance forward through the questionnaire.
- **US-3:** As a user, after answering all 13 questions, I am shown my risk rating (1-5) with a label (e.g. "Medium"), description, and a visual risk rating graphic.
- **US-4:** As a user, I can download a PDF report of my results containing the risk rating summary and all my question/answer selections.
- **US-5:** As a user, I can retake the test from the results page, which resets my answers and returns me to question 1.

### Edge Cases

- **US-6:** As a user, if I navigate directly to `/results` without completing the questionnaire (e.g. browser refresh), I am redirected to `/` instead of seeing a broken page.
- **US-7:** As a user, if a backend call fails, I am shown a friendly error page with a "Back" button that returns me to the start.
- **US-8:** As a user, if I click "Download PDF" and the generation takes time, I see a "Downloading PDF..." loading state so I know the action is in progress.

### Iframe Integration

- **US-9:** As a parent site operator, the app dynamically communicates its content height to the parent window via `postMessage`, so the iframe can resize without scrollbars.
- **US-10:** As a standalone visitor, the app renders correctly as a full page without requiring an iframe wrapper.

## 4. Functional Requirements

### 4.1 Frontend — Start Page (`/`)

1. Display an H2 heading: "Check your attitude to risk"
2. Display explanatory copy about the risk profiler
3. Render an interactive risk level selector (radio group, levels 1-5) where each level shows a label and description text
4. Display a disclaimer: the questionnaire does not consider age, goals, or capacity for loss
5. Display an H2 heading: "Take the questionnaire" with supporting text (13 multiple choice questions, less than 5 minutes)
6. Display an alert/info box: "We don't store your data"
7. Display a CTA button: "I'm ready to start"
8. On CTA click: dispatch `RESET_FORM` action and navigate to `/questionnaire`

### 4.2 Frontend — Questionnaire (`/questionnaire`)

9. On mount: call `getQuestions` GraphQL query (fetch policy: no-cache) and dispatch `SET_QUESTIONS` with the result
10. Display an H2 heading: "Your attitude to risk"
11. Render a segmented progress bar with `totalSteps` segments — green (completed), teal (current), grey (future). Display label: "Question N of M". Include ARIA attributes (`role="progressbar"`, `aria-valuemin={1}`, `aria-valuemax={totalSteps}`, `aria-valuenow={currentStep}`)
12. Render a `<fieldset>` with `<legend>` containing the question text, radio buttons for each answer option, and a submit button
13. The submit button label is "Next" for questions 1-12 and "Submit" for question 13
14. On submit: validate that an answer is selected (required), dispatch `UPDATE_ANSWERS` with `{ questionId: currentQuestion, responseId: selectedAnswerId }` (both parsed as integers), dispatch `SET_CURRENT_QUESTION` with `Math.min(currentQuestion + 1, questions.length)`, reset the form (clear radio selection)
15. When `answers.length === questions.length`: navigate to `/results`
16. Navigation is forward-only — there is no back button

### 4.3 Frontend — Results (`/results`)

17. Guard: if `questions.length === 0` (e.g. direct page load), redirect to `/`
18. On mount (once, when answers complete): call `calculateRisk` GraphQL mutation with `{ responses: state.answers }`, dispatch `SET_RISK_RATING` with the integer result, look up description from risk ratings map and dispatch `SET_RISK_RATING_DESCRIPTION`
19. Display a risk rating SVG image (`risk-rating-{1-5}.svg`) — simple graphic using Saltus colours
20. Display an H2: "Your risk level is {label}" and the description paragraph
21. Display a "Retake the test" button that dispatches `RESET_FORM` + `RESET_CREATE_PDF` and navigates to `/questionnaire`
22. Display an H2: "Next Steps" with a card: "Download the results and email to your adviser"
23. Display a "Download PDF" button. While loading, show "Downloading PDF..." text
24. On "Download PDF" click: call `generateRiskResultPDF` mutation with `{ input: { RiskRating: "${riskRating}", RiskAnswers: answers } }`, receive a pre-signed S3 URL, fetch the URL as a blob, trigger browser download as `risk-results.pdf`

### 4.4 Frontend — Error (`/error`)

25. Display message: "Apologies we're experiencing some technical issues..."
26. Display a "Back" button that dispatches `RESET_FORM` + `SET_QUESTIONS([])` and navigates to `/`

### 4.5 Frontend — State Management

27. Implement React Context + `useReducer` with the following state shape. We use Context + useReducer rather than Redux or Zustand because the state is small and predictable (13 questions, 13 answers, one rating) with no async middleware needs. useReducer gives us a clear action vocabulary without adding dependencies:

```typescript
{
  questions: Question[];        // From getQuestions (mocked backend)
  currentQuestion: number;      // 1-based index (starts at 1)
  answers: Answer[];            // Array of { questionId: number, responseId: number }
  riskRating?: number;          // Integer 1-5
  riskRatingDescription?: string;
  pdfUrl: string;               // Pre-signed S3 URL
}
```

28. Implement reducer actions: `SET_QUESTIONS`, `SET_CURRENT_QUESTION`, `UPDATE_ANSWERS`, `SET_RISK_RATING`, `SET_RISK_RATING_DESCRIPTION`, `RESET_FORM`, `CREATE_PDF`, `RESET_CREATE_PDF`
29. `SET_QUESTIONS` must guard: no-op if `!state.questions` (check current state is truthy before allowing update)
30. `RESET_FORM` resets `currentQuestion=1`, `answers=[]`, `riskRating=undefined` but keeps `questions`

### 4.6 Frontend — Iframe Height Resizing

31. Implement a `useIframeHeight` hook that runs `setInterval` (200ms) posting `['setHeight', documentHeight]` to `window.parent` via `postMessage('*')`. We use `setInterval` rather than `ResizeObserver` because the parent iframe needs periodic height updates even when DOM mutations don't trigger a resize event (e.g. font loading, image rendering). 200ms is frequent enough for smooth resizing without being expensive
32. The hook must be active in both standalone and iframe modes (harmless when not in an iframe — `window.parent === window` means postMessage goes to self)

### 4.7 Frontend — Analytics (Stubbed)

33. Stub out GTM analytics — include the event dispatch functions in the code but do not initialise GTM or require a container ID
34. The analytics hooks/functions should exist in the codebase so they can be wired up later if needed, but they are no-ops for the demo

### 4.8 Frontend — Risk Rating Map

35. Implement the following mapping:

| Rating | Label | Description |
|--------|-------|-------------|
| 1 | Lower | Conservative, short-term changes for modest/stable returns |
| 2 | Lower-Medium | Cautious, reasonable long-term returns, accept some risk |
| 3 | Medium | Balanced, accepts fluctuations for better long-term returns |
| 4 | Medium-Higher | Comfortable with risk for higher long-term returns |
| 5 | Higher | Very comfortable, aiming for high long-term returns |

### 4.9 Backend — GraphQL Schema (AppSync)

36. Implement the GraphQL schema with pipeline resolvers:

```graphql
type Query {
    getQuestions: [Question]
        @function(name: "getQuestionsSaltusATR-${env}")
}

type Mutation {
    calculateRisk(responses: [Response]): RiskResult
        @function(name: "calculateRiskSaltusATR-${env}")

    generateRiskResultPDF(input: RiskResultPDFInput): PDFOutput
        @function(name: "generateRiskResultPDFSaltusATR-${env}")
}

type Question    { id: ID!; text: String!; answers: [Answer]! }
type Answer      { id: ID!; text: String! }
type RiskResult  { rating: Int! }
type PDFOutput   { url: String! }
input Response   { questionId: ID!; responseId: ID! }
input RiskResultPDFInput { RiskRating: String!; RiskAnswers: [RiskAnswerInput] }
input RiskAnswerInput    { questionId: Int!; responseId: Int! }
```

Note: Since EValue is mocked, the token Lambda is eliminated. `getQuestions` and `calculateRisk` are single-Lambda resolvers (not pipelines). The original used pipeline resolvers to chain an OAuth token Lambda before the data Lambda — with no real API to authenticate against, this indirection adds complexity with no benefit.

### 4.10 Backend — Lambda: getQuestionsSaltusATR

37. Return the hardcoded 13 questions with their answer options directly (no external API call)
38. Response format: array of `{ id, text, answers: [{ id, text }] }` matching the GraphQL `Question` type
39. The hardcoded questions are the same 13 from the original spec (listed in section 4.14 below)

### 4.11 Backend — Lambda: calculateRiskSaltusATR

40. Receive responses from `event.arguments.responses`
41. Calculate a risk score using a simple weighted average: each question has 5 answer options scored 1-5 (first answer = highest risk appetite, last = lowest for most questions). Average all scores and round to the nearest integer, clamped to [1, 5]. We use a weighted average rather than a simpler sum because questions have different numbers of options (Q10 has 3, the rest have 5) — averaging normalises this. The forward/reverse scoring per question reflects how questions are framed: agreeing with "I enjoy exploring investments" indicates high risk tolerance, while agreeing with "I want my money to be safe" indicates low tolerance
42. Return `{ rating: <integer 1-5> }`
43. This is a deterministic mock — same answers always produce the same rating. Determinism is important so the demo behaves predictably during walkthroughs

### 4.12 Backend — Lambda: generateRiskResultPDFSaltusATR

44. Generate a UUID for the document filename
45. Extract `RiskRating` and `RiskAnswers` from `event.arguments.input`
46. Compile the Saltus-branded HTML template with lodash.template, passing `{ RiskRating, RiskQuestionsString, RiskAnswersString, date }`. We use lodash.template (Underscore-style `<%= %>`) rather than a JSX/React renderer because the template is static HTML with simple variable interpolation — no component lifecycle or reactivity needed, and lodash.template compiles to a plain string with minimal overhead
47. Store compiled HTML as `{uuid}_debug.html` in S3 (useful for debugging template rendering issues without re-running Chromium)
48. Render HTML to PDF using headless Chromium (Puppeteer-core + @sparticuz/chromium): A4 format, 1-inch margins, `printBackground: true`. We use Chromium rather than a library like pdfkit or jsPDF because the template relies on CSS layout, Google Fonts, and JavaScript — only a real browser engine can render this faithfully. `@sparticuz/chromium` is purpose-built for Lambda's execution environment
49. Store PDF as `{uuid}` in S3 with ContentType `application/pdf`. We store in S3 rather than returning inline through AppSync because PDFs can be several hundred KB — base64-encoding would add 33% overhead and risks hitting AppSync's 1MB response limit
50. Generate pre-signed GET URL (expires in 120 seconds). The 120-second expiry is short enough to discourage link sharing but long enough for the immediate download flow
51. Return `{ url }`
52. Lambda config: 2048MB memory, 300s timeout, Node.js 22.x runtime. The high memory is required because Chromium is memory-hungry (~500MB baseline). The 300s timeout accommodates Lambda cold starts (~8-15s for Chromium initialisation) plus rendering time

### 4.13 Backend — PDF Template (3-page A4, Saltus branded)

53. Use Saltus brand fonts: Georgia for headings, Roboto for body (via Google Fonts)
54. Use Saltus colour palette: Navy `#18263a` for primary text/headers, Teal `#9de6e4` for accents, Cream `#fff5e6` for backgrounds, Coral `#f0645a` for highlights
55. **Page 1 — Results Summary:** Teal accent line (top), H1: "Risk Profile Results" in navy, grey box with risk rating image + label + description, info box: "Please email this document to your Financial Adviser", teal accent line (bottom)
56. **Page 2 — Questions & Answers (Q1-Q7):** Header: "Risk Profiler Report", ordered list of questions 1-7 with all answer options as radio buttons, user's selection pre-checked
57. **Page 3 — Questions & Answers (Q8-Q13):** Same format, questions 8-13

### 4.14 Hardcoded Questions (used in getQuestions Lambda and PDF Lambda)

58. The following 13 questions and their answer options must be hardcoded in both the `getQuestionsSaltusATR` Lambda and the PDF Lambda's `data.ts`:

| # | Question | Answers (in order) |
|---|----------|--------------------|
| 1 | I would enjoy exploring investment opportunities for my money. | Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree |
| 2 | I would go for the best possible return even if there were risk involved. | Always / Usually / Sometimes / Rarely / Never |
| 3 | How would you describe your typical attitude when making important financial decisions? | Very adventurous / Fairly adventurous / Average / Fairly cautious / Very cautious |
| 4 | What amount of risk do you feel you have taken with your past financial decisions? | Very Large / Large / Medium / Small / Very small |
| 5 | To reach my financial goal I prefer an investment which is safe and grows slowly but steadily, even if it means lower growth overall. | Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree |
| 6 | I am looking for high investment growth. I am willing to accept the possibility of greater losses to achieve this. | Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree |
| 7 | If you had money to invest, how much would you be willing to place in an investment with possible high returns but a similar chance of losing some of your money? | All of it / More than half / Half / Less than half / Very little, if any |
| 8 | How do you think that a friend who knows you well would describe your attitude to taking financial risks? | Daring / Sometimes daring / A thoughtful risk taker / Careful / Very cautious and risk averse |
| 9 | If you had picked an investment with potential for large gains but also the risk of large losses how would you feel: | Panicked and very uncomfortable / Quite uneasy / A little concerned / Accepting of the possible highs and lows / Excited by the potential for gain |
| 10 | Imagine that you have some money to invest and a choice of two investment products, which option would you choose? | Low return, almost no risk / Higher return, some risk / A mixture of the two |
| 11 | I would prefer small certain gains to large uncertain ones. | Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree |
| 12 | When considering a major financial decision, which statement BEST describes the way you think about the possible losses or the possible gains? | Excited about gains / Optimistic about gains / Think about both / Conscious of losses / Worry about losses |
| 13 | I want my investment money to be safe even if it means lower returns. | Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree |

### 4.15 Backend — Risk Scoring Algorithm (Mock)

59. For questions where the first answer indicates higher risk tolerance (Q1, Q2, Q3, Q4, Q6, Q7, Q8): score the first answer as 5, second as 4, third as 3, fourth as 2, fifth as 1
60. For questions where the first answer indicates lower risk tolerance (Q5, Q9, Q11, Q13): reverse the scoring — first answer = 1, last answer = 5
61. For Q9: the answers are ordered from most risk-averse to most risk-tolerant, so score 1-5 in order (Panicked=1, Excited=5)
62. For Q10: 3 answers only — score as: "Low return, almost no risk" = 1, "A mixture of the two" = 3, "Higher return, some risk" = 5
63. For Q12: score as: "Worry about losses" = 1, "Conscious of losses" = 2, "Think about both" = 3, "Optimistic about gains" = 4, "Excited about gains" = 5
64. Average all 13 scores, round to nearest integer, clamp to [1, 5]

### 4.16 Backend — CDK Infrastructure

65. S3 Bucket for PDFs: `SaltusATRPDFStore-{env}`, all public access blocked
66. Cognito Identity Pool: unauthenticated access only (no login), IAM role for AppSync access. We use Cognito with anonymous access rather than API keys because: (a) API keys expire after max 365 days and can't be scoped via IAM, (b) Cognito issues temporary credentials that can be tightly scoped to `appsync:GraphQL` only, preventing misuse of other AWS services. The app doesn't need user accounts, but AppSync requires an auth mode — anonymous Cognito provides signed requests without requiring login
67. Lambda Layer: shared dependencies (puppeteer-core, @sparticuz/chromium, lodash.template)
68. AppSync API with the GraphQL schema from 4.9. We use AppSync rather than API Gateway + REST because it matches the original production architecture, provides a typed schema as self-documentation, and handles the Lambda-to-resolver wiring declaratively
69. Three Lambda functions: `getQuestionsSaltusATR`, `calculateRiskSaltusATR`, `generateRiskResultPDFSaltusATR`
70. All infrastructure in a single CDK stack rather than separate stacks per service. This is appropriate for a demo — single-command deploy/destroy with no cross-stack dependency management

No WAF, no Secrets Manager, no S3 lifecycle policy needed for demo. These are flagged as production hardening items but add complexity that isn't justified for an internal demo with no real user data.

### 4.17 Backend — S3 Service Layer

70. S3 client with 3-second connection timeout
71. `storeTemplate(bucket, filename, body)` — PutObject with ContentDisposition: 'inline'
72. `storeDocument(bucket, filename, body)` — PutObject with ContentType: 'application/pdf', ContentDisposition: 'inline'
73. `getDocumentUrl(bucket, filename)` — pre-signed GET URL, expires in 120 seconds

### 4.18 Frontend — Routing

74. Use React Router DOM 6.x with BrowserRouter
75. Routes: `/` (QuestionnaireStart), `/questionnaire` (Questionnaire), `/results` (Results), `/error` (Error)

### 4.19 Frontend — GraphQL Client

76. Use Apollo Client 3.x with AppSync IAM authentication. The original plan was to use `aws-appsync-auth-link`, but this library uses Node.js `url.parse()` internally which doesn't exist in Vite's browser environment. Instead, we implement custom SigV4 signing using `@smithy/signature-v4` — the same signing library AWS SDK v3 uses internally, so it's well-tested and browser-compatible
77. Use Cognito unauthenticated identity pool credentials. Credentials are fetched fresh on each request rather than cached — slightly wasteful but avoids expiry edge cases and keeps the implementation simple for a demo

## 5. Non-Goals (Out of Scope)

1. **Real EValue API integration** — All API responses are mocked in Lambda; no real EValue credentials needed
2. **Production infrastructure hardening** — No WAF, no Secrets Manager, no S3 lifecycle policies, no VPC
3. **User authentication or personal data collection** — The app is anonymous
4. **ESG questionnaire flow** — Not wired into routes or schema
5. **Back navigation in questionnaire** — Forward-only by design
6. **Analytics / GTM** — Stubbed out; event functions exist in code but do not fire
7. **Cookie consent** — Not needed for demo
8. **CI/CD pipeline setup** — Deploy manually or via CDK CLI
9. **Custom domain / SSL** — Use the default CloudFront or Amplify URL
10. **Rewriting user-facing copy** — Same copy as original spec, just replacing "Standard Life" with "Saltus"

## 6. Design Considerations

### 6.1 Saltus Design System (from `docs/saltus-website.pen`)

**Colour Palette:**

| Token | Hex | Usage |
|-------|-----|-------|
| Navy (Primary) | `#18263a` | Headers, primary buttons, body text |
| Dark Navy | `#22384f` | Secondary backgrounds, dark sections |
| Blue | `#325a7d` | Links, accents |
| Cream | `#fff5e6` | Page background |
| White | `#ffffff` | Card backgrounds, content areas |
| Coral | `#f0645a` | Alerts, highlights, accent buttons |
| Gold | `#ec9f22` | Warning states, secondary accents |
| Teal | `#9de6e4` | CTA buttons, progress indicators, accents |
| Green | `#49796b` | Success states, badges |
| Grey | `#8c9097` | Secondary text, descriptions, placeholders |
| Light Grey | `#eeeeee` | Borders, dividers |
| Divider Grey | `#dddddd` | Input borders, subtle separators |

**Typography:**

| Element | Font | Weight | Size |
|---------|------|--------|------|
| H1 | Georgia | 300 (light) | 52px |
| H2 | Georgia | normal | 26px |
| H3/Label | Roboto | 600 | 14px (uppercase, letter-spacing: 1) |
| Body | Roboto | normal | 16px |
| Small | Roboto | normal | 14px |
| Caption | Roboto | 500 | 12.8px |

**Component Mapping:**

| App Element | Saltus Component | ID |
|-------------|-----------------|-----|
| "I'm ready to start" CTA | Button/Primary/Default | `cfOru` |
| "Next" / "Submit" buttons | Button/Primary/Default | `cfOru` |
| "Retake the test" | Button/Outline/Default | `9u19F` |
| "Download PDF" | Button/CTA/Default (teal) | `DbcP0` |
| Risk level selector | Custom radio group (styled to Saltus palette) | -- |
| Progress bar segments | Custom (green completed, teal current, grey future) | -- |
| "Next Steps" card | Card/Service pattern | `zyVWh` |
| Info/alert boxes | Custom (teal background, navy text) | -- |

**Border Radius:** 12px for cards, 8px for inputs, 9999px (pill) for buttons/badges

**Shadows:** `0 1px 2.625px #00000014` (subtle card shadow)

### 6.2 Responsive Considerations

- The app renders inside an iframe (max-width dictated by parent) or standalone
- Content area should be max-width ~720px centered for readability
- Radio buttons and form elements must be touch-friendly (minimum 44px tap targets)

## 7. Technical Considerations

### 7.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | React 18 + TypeScript 5.x |
| Build toolchain | Vite 6.x |
| Routing | React Router DOM 6.x (BrowserRouter) |
| State management | React Context + useReducer |
| GraphQL client | Apollo Client 3.x with aws-appsync-auth-link |
| Forms | react-hook-form 7.x |
| UI/Styling | Tailwind CSS v4, Headless UI 2.x |
| Backend API | AWS AppSync (GraphQL, IAM auth) |
| Auth | AWS Cognito (unauthenticated identity pool) |
| Lambda runtime | Node.js 22.x (TypeScript) |
| PDF generation | Puppeteer-core + @sparticuz/chromium in Lambda |
| Infrastructure | AWS CDK |
| Hosting | S3 + CloudFront (via Amplify or CDK) |
| Package manager | Yarn 4.x (Berry) |
| Node version | 22 |

### 7.2 Key Architectural Decisions

- **Vite over CRA:** CRA is deprecated and no longer maintained. Vite provides faster HMR, native ESM, and a better plugin ecosystem. This choice also drove the SigV4 signing decision — Vite's browser-only build environment exposed an incompatibility in `aws-appsync-auth-link`
- **Tailwind CSS v4 over styled-components:** The original app used three overlapping styling systems (Ionic, Bootstrap, styled-components). Tailwind v4's `@theme` directive maps directly to Saltus design tokens and eliminates runtime CSS-in-JS overhead. v4 specifically because it requires no `tailwind.config.js` — the theme lives in CSS where designers can read it
- **Headless UI v2 only (no Ionic/React Bootstrap):** Reduces dependency count from 3 UI libraries to 1. Headless UI provides accessible primitives (RadioGroup) with zero styling opinions — we apply Saltus styles via Tailwind. v2 specifically because its `data-checked:` attribute pattern maps directly onto Tailwind v4's data attribute variants
- **Mocked EValue API:** Lambdas return hardcoded questions and use a simple scoring algorithm — no external API calls, no secrets, no OAuth flow. This means any developer can deploy to their own AWS account with a single `cdk deploy` command
- **PDF download via blob:** Navigating directly to the pre-signed S3 URL would open the PDF in-browser on most browsers rather than downloading it. Fetching as a blob via axios and triggering download via `file-saver` guarantees a download prompt with a consistent filename (`risk-results.pdf`) across all browsers
- **Mock GraphQL link for local dev:** When `VITE_APPSYNC_ENDPOINT` is not configured, Apollo falls back to an in-process mock that runs the real scoring algorithm. This means frontend development never blocks on infrastructure deployment — the UI is fully interactive from day one

### 7.3 Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_APPSYNC_ENDPOINT` | AppSync GraphQL endpoint URL |
| `VITE_APPSYNC_REGION` | AWS region |
| `VITE_COGNITO_IDENTITY_POOL_ID` | Cognito identity pool for unauthenticated access |

### 7.4 Project Structure (Proposed)

```
src/
  components/
    ProgressBar.tsx
    QuestionForm.tsx
    RiskLevelSelector.tsx
    Layout.tsx
  pages/
    QuestionnaireStart.tsx
    Questionnaire.tsx
    Results.tsx
    Error.tsx
  context/
    QuestionnaireContext.tsx
    questionnaireReducer.ts
    types.ts
  graphql/
    client.ts
    queries.ts
    mutations.ts
  hooks/
    useIframeHeight.ts
    useAnalytics.ts          # Stubbed — no-op for demo
  utils/
    riskRatings.ts
  assets/
    risk-rating-1.svg ... risk-rating-5.svg
  App.tsx
  main.tsx
  index.css                  # Tailwind directives + Saltus theme

infrastructure/
  lib/
    saltus-atr-stack.ts      # Single CDK stack: S3, Cognito, AppSync, Lambdas
  bin/
    app.ts
  lambda/
    getQuestions/
      index.ts
      data.ts                # Hardcoded 13 questions
    calculateRisk/
      index.ts
      scoring.ts             # Simple weighted-average scoring
    generatePDF/
      index.ts
      template.ts            # Saltus-branded HTML template
      data.ts                # Hardcoded 13 questions (for PDF rendering)
      s3Service.ts
```

## 8. Success Metrics

1. **End-to-end flow works:** User can start questionnaire, answer 13 questions, see a risk rating, download a PDF — all in one session
2. **Saltus branding:** App visually matches the Saltus design system (colours, typography, component styles) from `docs/saltus-website.pen`
3. **PDF generation:** PDF downloads within 15 seconds, contains correct risk rating, all 13 questions with answers, and Saltus branding
4. **Iframe compatibility:** App correctly resizes in an iframe via postMessage; works as standalone page too
5. **Accessibility basics:** Progress bar and radio groups are keyboard navigable with correct ARIA attributes; semantic HTML throughout
6. **Error handling:** Backend failures surface the error page; no unhandled exceptions in console
7. **Demo-ready:** Can be deployed to a fresh AWS account with `cdk deploy` and demonstrated without any pre-existing secrets or configuration

## 9. Open Questions

1. **Risk rating SVG assets:** Should we design simple Saltus-branded risk rating graphics (e.g. a gauge or bar chart using the colour palette), or use plain text/icons?
2. **AWS region:** ~~Deploy to `eu-west-1` (London) or another region?~~ Resolved: `eu-west-2` (London)
3. **Hosting preference:** Amplify hosting (simpler) or CDK-managed S3 + CloudFront (more control)?

## 10. Assumptions

1. **No real EValue API:** Questions are hardcoded and risk calculation is a simple scoring algorithm. The app does not call any external APIs
2. **No secrets or API keys required:** The entire app can be deployed with just `cdk deploy` and the resulting outputs
3. **13 questions:** The questionnaire has exactly 13 questions. The PDF template layout (Q1-7 on page 2, Q8-13 on page 3) depends on this count
4. **Developer's own AWS account:** Infrastructure is deployed to a personal/dev AWS account, not Saltus production
5. **Unauthenticated access:** Cognito identity pool allows unauthenticated access — no user login flow
6. **PDF expiry:** Pre-signed S3 URLs expire after 120 seconds; the frontend fetches immediately as blob
7. **Risk scoring is approximate:** The mock scoring algorithm produces plausible but not identical results to the real EValue calculation. This is acceptable for demo purposes
8. **Browser support:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge latest 2 versions)
9. **Saltus branding fonts available:** Georgia is a system font; Roboto is loaded from Google Fonts
10. **No server-side rendering needed:** The app is a client-side SPA
