# ATR Questionnaire

A 13-question attitude-to-risk questionnaire (EValue "5risk" system) built as a React SPA. Embedded via iframe on the Standard Life website, fully anonymous (no auth or personal data), and calculates a risk rating 1–5 with a downloadable PDF report.

## Tech Stack

- **Frontend:** React 18, TypeScript, Create React App
- **Package Manager:** Yarn 4.x (Berry)
- **Backend:** AWS AppSync (GraphQL, IAM auth), Lambda (Node.js 22.x)
- **Infrastructure:** AWS CDK + Amplify CLI
- **Hosting:** S3 + CloudFront via Amplify
- **CI/CD:** Bitbucket Pipelines

## How It Works

1. **Questions** are served from a hardcoded dataset in the `getQuestions` Lambda — no external API call. The frontend fetches them via a GraphQL query through AppSync.
2. **User answers** all 13 questions in a forward-only flow (no back button). State is held in-memory with React Context + `useReducer` — nothing is persisted.
3. **Risk score** (1–5) is calculated server-side by the `calculateRisk` Lambda using a local scoring algorithm (weighted average with forward/reverse scoring per question). No external API involved.
4. **PDF report** is generated on-demand by a Lambda running headless Chromium (Puppeteer), uploaded to S3, and returned as a pre-signed URL (120s expiry).

There is no database and no external API dependency at runtime. Questions and scoring logic are self-contained in the Lambdas. The only stored artifact is the temporary PDF in S3.

## Getting Started

```bash
yarn install        # Install dependencies
yarn start          # Dev server
yarn build          # Production build
yarn test           # Run tests (Jest, watch mode)
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page with risk level info and CTA |
| `/questionnaire` | 13 questions with progress bar |
| `/results` | Risk rating display and PDF download |
| `/error` | Technical error with back button |

## Environment Variables

| Variable | Description |
|---|---|
| `REACT_APP_GTM_API_KEY` | Google Tag Manager API key |
