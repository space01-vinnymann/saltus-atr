# PRD: EValue API Integration

## 1. Introduction / Overview

The ATR questionnaire currently uses hardcoded questions and local risk scoring in its Lambda functions. This feature replaces both with live calls to EValue's "5risk" API, making the app a true pass-through to EValue's questionnaire and scoring engine.

This involves:

- A new **shared token Lambda** that fetches OAuth2 credentials from AWS Secrets Manager and obtains a bearer token from EValue
- Modifying **getQuestions** to call EValue's `getQuestionnaireData` endpoint instead of returning hardcoded data
- Modifying **calculateRisk** to call EValue's `calculateRisk` endpoint instead of using local scoring logic
- Updating the **CDK stack** to use AppSync pipeline resolvers (token Lambda runs first, then the operation Lambda)
- Updating the **GraphQL schema** to accept questions in the PDF mutation input (so the PDF Lambda no longer needs hardcoded questions)
- Removing the hardcoded question data and local scoring logic

## 2. Goals

1. Fetch questionnaire data live from EValue's API via the `getQuestionnaireData` endpoint
2. Calculate risk ratings via EValue's API via the `calculateRisk` endpoint, removing local scoring logic
3. Authenticate with EValue using OAuth2 `client_credentials` flow, with secrets stored in AWS Secrets Manager
4. Use AppSync pipeline resolvers so token fetching is a shared, reusable first step
5. Eliminate the sync risk between hardcoded questions and EValue's live data by passing questions from the frontend to the PDF Lambda
6. Remove all hardcoded question data (`data.ts`) and local scoring logic (`scoring.ts`) from the Lambdas

## 3. User Stories

### Happy Path

- **As a user**, when I start the questionnaire, the app fetches the latest questions from EValue so I always see the current version of the 5risk questionnaire.
- **As a user**, when I submit my answers, my risk rating is calculated by EValue's scoring engine, giving me an authoritative result.
- **As a user**, when I download the PDF, it shows the exact questions and answers from my session (not a potentially stale hardcoded set).

### Error States

- **As a user**, if EValue's API is unreachable or returns an error when fetching questions, I see the error page (`/error`) with a clear message that something went wrong, and a button to try again.
- **As a user**, if EValue's API fails during risk calculation, I see the error page rather than a stale or incorrect result.
- **As a user**, if the OAuth token request fails (e.g., invalid credentials), I see the error page. No partial or broken state is shown.

### Developer / Ops

- **As a developer**, I can change the target environment (dev/prod) by updating the secret name suffix in CDK context or environment variables, without changing Lambda code.
- **As a developer**, I can see structured error logs in CloudWatch when EValue API calls fail, including the HTTP status code and response body.

## 4. Functional Requirements

### 4.1 AWS Secrets Manager Secret

1. A secret named `SALTUS-ATR-{env}` (e.g., `SALTUS-ATR-dev`, `SALTUS-ATR-prod`) must be created in AWS Secrets Manager in `eu-west-2`.
2. The secret must contain the following JSON structure:
   ```json
   {
     "EVALUE_CONSUMER_KEY": "<consumer-key>",
     "EVALUE_CONSUMER_SECRET": "<consumer-secret>"
   }
   ```
3. The secret name must be passed to the token Lambda as an environment variable (`SECRET_NAME`), not hardcoded in Lambda code.

### 4.2 Token Lambda (`getEvalueToken`)

4. A new Lambda function (`getEvalueToken`) must be created that:
   - Reads the secret name from the `SECRET_NAME` environment variable
   - Fetches the secret value from AWS Secrets Manager using the AWS SDK
   - Extracts `EVALUE_CONSUMER_KEY` and `EVALUE_CONSUMER_SECRET` from the secret JSON
   - Reads the EValue API base URL from the `EVALUE_API_BASE_URL` environment variable
   - Makes a `POST` request to `{EVALUE_API_BASE_URL}/token` with:
     - Header: `Authorization: Basic <base64(CONSUMER_KEY:CONSUMER_SECRET)>`
     - Header: `Content-Type: application/x-www-form-urlencoded`
     - Body: `grant_type=client_credentials`
   - Returns the parsed JSON response (containing `access_token`, `token_type`, `expires_in`, `scope`)
5. If Secrets Manager fetch fails, the Lambda must throw an error with the message: `"Failed to retrieve EValue credentials"`
6. If the EValue token endpoint returns a non-2xx status, the Lambda must throw an error with the message: `"Failed to obtain EValue access token"` and log the HTTP status code and response body.
7. The Lambda must have an IAM policy granting `secretsmanager:GetSecretValue` for the specific secret ARN.
8. Runtime: Node.js 22.x, 256MB memory, 30s timeout.

### 4.3 getQuestions Lambda (Modified)

9. The pipeline resolver's request mapping template must forward the token Lambda's result into the getQuestions Lambda's event payload (e.g., as `event.prev.result`). The Lambda must read the bearer token from this forwarded payload.
10. If `access_token` is missing from the forwarded payload, the Lambda must throw an error: `"Missing EValue access token"`
11. The Lambda must read the EValue API base URL from the `EVALUE_API_BASE_URL` environment variable and make a `POST` request to `{EVALUE_API_BASE_URL}/riskQuestionnaire/1.0.0/riskProfiler/getQuestionnaireData` with:
    - Header: `Authorization: Bearer <access_token>`
    - Header: `Content-Type: application/json`
    - Body: `{ "questionnaireName": "5risk" }`
12. The Lambda must transform the EValue response to match the existing GraphQL schema:
    - `questionId` -> `id` (as string)
    - `questionText` -> `text`
    - `responses[].responseId` -> `answers[].id` (as string)
    - `responses[].responseText` -> `answers[].text`
13. The Lambda must return an array of transformed `Question` objects.
14. If the EValue API returns a non-2xx status, the Lambda must throw: `"Failed to fetch questions from EValue"` and log the status code and response body.
15. The hardcoded `data.ts` file in `getQuestions/` must be deleted.

### 4.4 calculateRisk Lambda (Modified)

16. The pipeline resolver's request mapping template must forward the token Lambda's result into the calculateRisk Lambda's event payload (e.g., as `event.prev.result`). The Lambda must read the bearer token from this forwarded payload.
17. If `access_token` is missing from the forwarded payload, the Lambda must throw an error: `"Missing EValue access token"`
18. The user's responses must be read from `event.arguments.responses`.
19. The Lambda must read the EValue API base URL from the `EVALUE_API_BASE_URL` environment variable and make a `POST` request to `{EVALUE_API_BASE_URL}/riskQuestionnaire/1.0.0/riskProfiler/calculateRisk` with:
    - Header: `Authorization: Bearer <access_token>`
    - Header: `Content-Type: application/json`
    - Body:
      ```json
      {
        "responses": [{ "questionId": "1", "responseId": "2" }, ...],
        "questionnaireName": "5risk",
        "term": 15
      }
      ```
    - Note: `questionId` and `responseId` must be strings in the request body. `term` is always hardcoded to `15`.
20. The Lambda must transform the EValue response:
    - Clamp `riskProfile` to the range [1, 5]
    - Truncate to integer using `parseInt()`
    - Return `{ rating: <integer> }`
21. If the EValue API returns a non-2xx status, the Lambda must throw: `"Failed to calculate risk rating"` and log the status code and response body.
22. The `scoring.ts` and `scoring.test.ts` files must be deleted.

### 4.5 CDK Stack Changes (Pipeline Resolvers)

23. The CDK stack must create the new `getEvalueToken` Lambda with:
    - Environment variable `SECRET_NAME` set to `SALTUS-ATR-dev` (configurable via CDK context or a stack variable for future environments)
    - Environment variable `EVALUE_API_BASE_URL` set to `https://api.evalueproduction.com` (configurable via CDK context for future sandbox/staging use)
    - IAM policy for `secretsmanager:GetSecretValue` scoped to the specific secret
24. The `getQuestions` and `calculateRisk` Lambdas must also receive the `EVALUE_API_BASE_URL` environment variable.
25. The `getQuestions` AppSync resolver must be changed from a single Lambda resolver to a **pipeline resolver** with two functions:
    - Function 1: `getEvalueToken` Lambda
    - Function 2: `getQuestions` Lambda
26. The `calculateRisk` AppSync resolver must be changed from a single Lambda resolver to a **pipeline resolver** with two functions:
    - Function 1: `getEvalueToken` Lambda
    - Function 2: `calculateRisk` Lambda
27. Pipeline resolver mapping templates (JS resolvers) must forward `ctx.prev.result` into each subsequent Lambda's event payload, and forward `ctx.arguments` so operation Lambdas can access GraphQL arguments.
28. The `generateRiskResultPDF` resolver remains a single Lambda resolver (no token needed).

### 4.6 GraphQL Schema Changes (PDF Questions Input)

29. The `RiskResultPDFInput` input type must be updated to accept questions:
    ```graphql
    input RiskResultPDFInput {
      RiskRating: String!
      RiskAnswers: [RiskAnswerInput]!
      RiskQuestions: [RiskQuestionInput]!
    }

    input RiskQuestionInput {
      questionId: Int!
      questionText: String!
      responses: [RiskResponseInput]!
    }

    input RiskResponseInput {
      responseId: Int!
      responseText: String!
    }
    ```
30. The frontend must include the full questions array (with all answer options) when calling `generateRiskResultPDF`.

### 4.7 generatePDF Lambda (Modified)

31. The PDF Lambda must read questions from `event.arguments.input.RiskQuestions` instead of importing from `data.ts`.
32. The hardcoded `data.ts` file in `generatePDF/` must be deleted.
33. The PDF Lambda must validate that `RiskQuestions` is a non-empty array and throw an error if missing.

### 4.8 Frontend Changes

34. The `generateRiskResultPDF` GraphQL mutation call must be updated to include `RiskQuestions` from state, mapped to the new input shape:
    ```typescript
    RiskQuestions: state.questions.map(q => ({
      questionId: parseInt(q.id),
      questionText: q.text,
      responses: q.answers.map(a => ({
        responseId: parseInt(a.id),
        responseText: a.text
      }))
    }))
    ```
35. The GraphQL mutation query string for `generateRiskResultPDF` must be updated to include the new `RiskQuestions` field in the input.

### 4.9 Tests

36. Unit tests for the `getEvalueToken` Lambda must cover:
    - Successful token fetch (mock Secrets Manager + EValue token endpoint)
    - Secrets Manager failure (throws `"Failed to retrieve EValue credentials"`)
    - EValue token endpoint non-2xx response (throws `"Failed to obtain EValue access token"`)
37. Unit tests for the `getQuestions` Lambda must cover:
    - Successful question fetch and transformation (mock EValue API, verify field mapping)
    - Missing `access_token` in event (throws `"Missing EValue access token"`)
    - EValue API non-2xx response (throws `"Failed to fetch questions from EValue"`)
38. Unit tests for the `calculateRisk` Lambda must cover:
    - Successful risk calculation and response transformation (mock EValue API)
    - Risk profile clamping: values below 1 clamp to 1, values above 5 clamp to 5
    - Risk profile truncation: decimal values are truncated to integer via `parseInt()`
    - Missing `access_token` in event (throws `"Missing EValue access token"`)
    - EValue API non-2xx response (throws `"Failed to calculate risk rating"`)

## 5. Non-Goals (Out of Scope)

- **Token caching:** Tokens are fetched fresh per request. No caching layer (Lambda-level or external) is being added. This matches the original spec's design.
- **Retry logic:** No automatic retry on EValue API failures. If it fails, it fails and the user sees the error page.
- **ESG flow:** ESG-related Lambda functions mentioned in the spec are not part of this work.
- **Environment promotion:** Setting up separate dev/staging/prod deployments or CI/CD pipelines is not in scope. The secret name is configurable, but only one environment is deployed at a time.
- **Rate limiting:** No rate limiting on EValue API calls from our Lambdas.
- **Monitoring/alerting:** No CloudWatch alarms or dashboards for EValue API failures.

## 6. Technical Considerations

### Dependencies

- The EValue API must be reachable from Lambda functions in `eu-west-2`. No VPC configuration is expected (Lambdas run in the default AWS-managed VPC with internet access).
- AWS Secrets Manager secret must be created manually before deployment (or via a separate CDK construct). The Lambda code assumes it already exists.
- The `node-fetch` or native `fetch` (available in Node.js 22.x) can be used for HTTP calls. Node.js 22.x has native `fetch` built in — prefer this to avoid adding dependencies.

### AppSync Pipeline Resolvers in CDK

AppSync pipeline resolvers in CDK require:
- Creating `AppsyncFunction` objects (one per Lambda data source)
- Creating a resolver with `pipelineConfig` that references the functions in order
- Before/after mapping templates (can use minimal pass-through templates with JS resolvers)

This is the key infrastructure change and may require referencing current CDK AppSync documentation.

### EValue API Base URL

All EValue endpoints use `https://api.evalueproduction.com`. This is the production URL. The base URL is passed as the `EVALUE_API_BASE_URL` environment variable on all Lambdas that call EValue, making it easy to swap for a sandbox URL in the future.

### Secrets Manager Region

Secret lives in `eu-west-2` (same region as the stack).

## 7. Success Metrics

1. `getQuestions` returns live questions from EValue's API (verified by comparing response to EValue's API store documentation)
2. `calculateRisk` returns a rating from EValue that matches the expected scoring for known answer sets
3. PDF download includes the live questions from the user's session (not hardcoded data)
4. All hardcoded question data (`data.ts` in getQuestions and generatePDF) and local scoring logic (`scoring.ts`) are removed from the codebase
5. End-to-end flow works: start -> answer 13 questions -> see risk rating -> download PDF

## 8. Open Questions

1. ~~**Secrets Manager region:** Should the secret be in `eu-west-2` (same as the stack) or `eu-west-1` (as mentioned in the original SLAL spec)?~~ **Resolved:** `eu-west-2` (same as stack).
2. **EValue sandbox:** Does EValue provide a sandbox/test environment, or do we use the production API (`api.evalueproduction.com`) for development too? **Unknown — confirm with EValue/boss.**
3. **EValue response shape validation:** Should we validate the shape of EValue's responses (e.g., check that `questions` is an array, each has `questionId`, etc.), or trust the API contract?
4. **EValue API versioning:** The endpoint includes `1.0.0` in the path. How will we be notified if EValue releases a new version?

## 9. Assumptions

1. **EValue API contract is stable:** The response shapes documented in the APPLICATION_SPEC (section 4) are accurate and won't change without notice.
2. **OAuth2 `client_credentials` flow:** EValue's token endpoint follows standard OAuth2. The token response includes `access_token` as a top-level field.
3. **No VPC required:** Lambdas can reach `api.evalueproduction.com` over the public internet without VPC/NAT configuration.
4. **Single environment for now:** Only one environment (`dev`) is deployed. The secret name is `SALTUS-ATR-dev`. The secret name and API base URL are configurable for future environments but only `dev` is active.
5. **`term: 15` is always correct:** The hardcoded term value of 15 is the correct value for Saltus's use case and does not need to be configurable.
6. **Questions don't change frequently:** EValue's 5risk questionnaire (13 questions) is stable enough that passing questions from frontend to PDF Lambda (via a single session) won't cause stale-data issues.
7. **Node.js 22.x native `fetch`:** Available in the Lambda runtime and does not need a polyfill or external package.
8. **Frontend state holds full question data:** The frontend's `state.questions` array contains the full question text and all answer options (not just IDs), making it suitable to pass to the PDF Lambda.
