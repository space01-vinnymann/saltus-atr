import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  Observable,
} from '@apollo/client'
import { SignatureV4 } from '@smithy/signature-v4'
import { HttpRequest } from '@smithy/protocol-http'
import { Sha256 } from '@aws-crypto/sha256-browser'
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} from '@aws-sdk/client-cognito-identity'
import { getDefinition } from './mockLink'

const url = import.meta.env.VITE_APPSYNC_ENDPOINT ?? ''
const region = import.meta.env.VITE_APPSYNC_REGION ?? 'eu-west-2'
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID ?? ''

const useMock = !url

function createMockLink(): ApolloLink {
  return new ApolloLink((operation) => {
    return new Observable((observer) => {
      const result = getDefinition(operation)
      setTimeout(() => {
        observer.next({ data: result })
        observer.complete()
      }, 300)
    })
  })
}

function createAppSyncLink(): ApolloLink {
  const cognitoClient = new CognitoIdentityClient({ region })

  async function getCredentials() {
    const { IdentityId } = await cognitoClient.send(
      new GetIdCommand({ IdentityPoolId: identityPoolId }),
    )
    const { Credentials } = await cognitoClient.send(
      new GetCredentialsForIdentityCommand({ IdentityId }),
    )
    if (!Credentials?.AccessKeyId || !Credentials?.SecretKey || !Credentials?.SessionToken) {
      throw new Error('Failed to obtain Cognito credentials')
    }
    return {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretKey,
      sessionToken: Credentials.SessionToken,
    }
  }

  const signer = new SignatureV4({
    service: 'appsync',
    region,
    credentials: getCredentials,
    sha256: Sha256,
  })

  const endpoint = new URL(url)

  // Custom fetch that signs the exact request body Apollo produces
  const signedFetch: typeof fetch = async (input, init) => {
    const httpRequest = new HttpRequest({
      method: init?.method ?? 'POST',
      protocol: endpoint.protocol,
      hostname: endpoint.hostname,
      port: endpoint.port ? Number(endpoint.port) : undefined,
      path: endpoint.pathname,
      headers: {
        'content-type': 'application/json',
        host: endpoint.host,
      },
      body: init?.body as string,
    })

    const signed = await signer.sign(httpRequest)
    return fetch(input, {
      ...init,
      headers: signed.headers,
    })
  }

  return new HttpLink({ uri: url, fetch: signedFetch })
}

export const client = new ApolloClient({
  link: useMock ? createMockLink() : createAppSyncLink(),
  cache: new InMemoryCache(),
})

if (useMock) {
  console.log('[GraphQL] Using mock data — set VITE_APPSYNC_ENDPOINT to use real backend')
}
