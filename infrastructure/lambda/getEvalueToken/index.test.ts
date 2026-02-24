import { describe, it, expect, vi, beforeEach } from 'vitest'

const { sendMock, mockFetch } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  mockFetch: vi.fn(),
}))

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: class {
    send = sendMock
  },
  GetSecretValueCommand: class {
    constructor(public input: unknown) {}
  },
}))

vi.stubGlobal('fetch', mockFetch)

import { handler } from './index'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SECRET_NAME = 'SALTUS-ATR-EVALUE-dev'
  process.env.EVALUE_API_BASE_URL = 'https://api.evalueproduction.com'
})

describe('getEvalueToken', () => {
  it('fetches credentials from Secrets Manager and returns a token', async () => {
    sendMock.mockResolvedValue({
      SecretString: JSON.stringify({
        EVALUE_CONSUMER_KEY: 'test-key',
        EVALUE_CONSUMER_SECRET: 'test-secret',
      }),
    })

    const tokenBody = {
      access_token: 'abc123',
      token_type: 'bearer',
      expires_in: 3600,
      scope: '',
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tokenBody),
    })

    const result = await handler()

    expect(result).toEqual(tokenBody)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.evalueproduction.com/token',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from('test-key:test-secret').toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      })
    )
  })

  it('throws when Secrets Manager fails', async () => {
    sendMock.mockRejectedValue(new Error('SM error'))

    await expect(handler()).rejects.toThrow(
      'Failed to retrieve EValue credentials'
    )
  })

  it('throws when EValue token endpoint returns non-2xx', async () => {
    sendMock.mockResolvedValue({
      SecretString: JSON.stringify({
        EVALUE_CONSUMER_KEY: 'test-key',
        EVALUE_CONSUMER_SECRET: 'test-secret',
      }),
    })

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    })

    await expect(handler()).rejects.toThrow(
      'Failed to obtain EValue access token'
    )
  })

  it('throws when SECRET_NAME env var is missing', async () => {
    delete process.env.SECRET_NAME

    await expect(handler()).rejects.toThrow(
      'SECRET_NAME environment variable is not set'
    )
  })

  it('throws when EVALUE_API_BASE_URL env var is missing', async () => {
    delete process.env.EVALUE_API_BASE_URL

    await expect(handler()).rejects.toThrow(
      'EVALUE_API_BASE_URL environment variable is not set'
    )
  })
})
