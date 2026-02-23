import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { createAuthLink } from 'aws-appsync-auth-link'
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity'

// TODO: This requires deployed infrastructure to function.
// The AppSync endpoint and Cognito pool are provisioned by the CDK stack (Task 4).

const url = import.meta.env.VITE_APPSYNC_ENDPOINT ?? ''
const region = import.meta.env.VITE_APPSYNC_REGION ?? 'eu-west-2'
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID ?? ''

const cognitoClient = new CognitoIdentityClient({ region })

async function getCredentials() {
  const { IdentityId } = await cognitoClient.send(
    new GetIdCommand({ IdentityPoolId: identityPoolId }),
  )
  const { Credentials } = await cognitoClient.send(
    new GetCredentialsForIdentityCommand({ IdentityId }),
  )
  return {
    accessKeyId: Credentials!.AccessKeyId!,
    secretAccessKey: Credentials!.SecretKey!,
    sessionToken: Credentials!.SessionToken!,
  }
}

const authLink = createAuthLink({
  url,
  region,
  auth: {
    type: 'AWS_IAM',
    credentials: getCredentials,
  },
})

const httpLink = createHttpLink({ uri: url })

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
})
