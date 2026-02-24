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
})

const evalueResponse = [
  {
    questionId: 1,
    questionText: 'How adventurous are you?',
    responses: [
      { responseId: 1, responseText: 'Very adventurous' },
      { responseId: 2, responseText: 'Fairly cautious' },
    ],
  },
  {
    questionId: 2,
    questionText: 'What is your risk tolerance?',
    responses: [
      { responseId: 3, responseText: 'High' },
      { responseId: 4, responseText: 'Low' },
    ],
  },
]

describe('getQuestions', () => {
  it('fetches questions from EValue and transforms the response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(evalueResponse),
    })

    const result = await handler(makeEvent('test-token') as never)

    expect(result).toEqual([
      {
        id: '1',
        text: 'How adventurous are you?',
        answers: [
          { id: '1', text: 'Very adventurous' },
          { id: '2', text: 'Fairly cautious' },
        ],
      },
      {
        id: '2',
        text: 'What is your risk tolerance?',
        answers: [
          { id: '3', text: 'High' },
          { id: '4', text: 'Low' },
        ],
      },
    ])

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.evalueproduction.com/riskQuestionnaire/1.0.0/riskProfiler/getQuestionnaireData',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionnaireName: '5risk' }),
      })
    )
  })

  it('returns ids as strings matching GraphQL Question type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            questionId: 42,
            questionText: 'Test',
            responses: [{ responseId: 99, responseText: 'Answer' }],
          },
        ]),
    })

    const result = await handler(makeEvent('token') as never)

    expect(result[0].id).toBe('42')
    expect(typeof result[0].id).toBe('string')
    expect(result[0].answers[0].id).toBe('99')
    expect(typeof result[0].answers[0].id).toBe('string')
  })

  it('throws when access_token is missing', async () => {
    await expect(handler(makeEvent(undefined) as never)).rejects.toThrow(
      'Missing EValue access token'
    )
  })

  it('throws when EValue API returns non-2xx', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })

    await expect(handler(makeEvent('token') as never)).rejects.toThrow(
      'Failed to fetch questions from EValue'
    )
  })
})
