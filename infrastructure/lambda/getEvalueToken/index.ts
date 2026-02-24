import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({})

export const handler = async () => {
  const secretName = process.env.SECRET_NAME
  if (!secretName) {
    throw new Error('SECRET_NAME environment variable is not set')
  }

  const baseUrl = process.env.EVALUE_API_BASE_URL
  if (!baseUrl) {
    throw new Error('EVALUE_API_BASE_URL environment variable is not set')
  }

  let consumerKey: string
  let consumerSecret: string

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName })
    const response = await client.send(command)
    const secret = JSON.parse(response.SecretString!)
    consumerKey = secret.EVALUE_CONSUMER_KEY
    consumerSecret = secret.EVALUE_CONSUMER_SECRET
  } catch {
    throw new Error('Failed to retrieve EValue credentials')
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    'base64'
  )

  const tokenResponse = await fetch(`${baseUrl}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text()
    console.error(
      `EValue token request failed: status=${tokenResponse.status}, body=${body}`
    )
    throw new Error('Failed to obtain EValue access token')
  }

  return tokenResponse.json()
}
