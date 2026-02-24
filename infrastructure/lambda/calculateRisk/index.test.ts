import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal('fetch', mockFetch)

import { handler } from './index'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.EVALUE_API_BASE_URL = 'https://api.evalueproduction.com'
})

const makeEvent = (accessToken?: string) => ({
  prev: {
    result: {
      access_token: accessToken,
    },
  },
  arguments: {
    responses: [
      { questionId: '1', responseId: '2' },
      { questionId: '2', responseId: '3' },
    ],
  },
})

describe('calculateRisk', () => {
  it('calls EValue API and returns the risk rating', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ riskProfile: 3 }),
    })

    const result = await handler(makeEvent('test-token') as never)

    expect(result).toEqual({ rating: 3 })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.evalueproduction.com/riskQuestionnaire/1.0.0/riskProfiler/calculateRisk',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses: [
            { questionId: '1', responseId: '2' },
            { questionId: '2', responseId: '3' },
          ],
          questionnaireName: '5risk',
          term: 15,
        }),
      })
    )
  })

  it('clamps risk profile below 1 to 1', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ riskProfile: 0 }),
    })

    const result = await handler(makeEvent('token') as never)
    expect(result).toEqual({ rating: 1 })
  })

  it('clamps risk profile above 5 to 5', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ riskProfile: 8 }),
    })

    const result = await handler(makeEvent('token') as never)
    expect(result).toEqual({ rating: 5 })
  })

  it('truncates decimal risk profile via parseInt (e.g. 3.7 -> 3)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ riskProfile: 3.7 }),
    })

    const result = await handler(makeEvent('token') as never)
    expect(result).toEqual({ rating: 3 })
  })

  it('throws when access_token is missing', async () => {
    await expect(handler(makeEvent(undefined) as never)).rejects.toThrow(
      'Missing EValue access token'
    )
  })

  it('throws when EValue API returns non-2xx', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    })

    await expect(handler(makeEvent('token') as never)).rejects.toThrow(
      'Failed to calculate risk rating'
    )
  })
})
