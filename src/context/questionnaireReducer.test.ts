import { questionnaireReducer, initialState } from './questionnaireReducer'
import type { AppState, Question } from './types'

const mockQuestions: Question[] = [
  { id: '1', text: 'Question 1', answers: [{ id: '1', text: 'A' }, { id: '2', text: 'B' }] },
  { id: '2', text: 'Question 2', answers: [{ id: '1', text: 'C' }, { id: '2', text: 'D' }] },
]

describe('questionnaireReducer', () => {
  it('SET_QUESTIONS sets questions array', () => {
    const result = questionnaireReducer(initialState, {
      type: 'SET_QUESTIONS',
      payload: mockQuestions,
    })
    expect(result.questions).toEqual(mockQuestions)
  })

  it('SET_QUESTIONS no-ops when state.questions is falsy', () => {
    const stateWithNullQuestions = { ...initialState, questions: null } as unknown as AppState
    const result = questionnaireReducer(stateWithNullQuestions, {
      type: 'SET_QUESTIONS',
      payload: mockQuestions,
    })
    expect(result.questions).toBeNull()
  })

  it('SET_CURRENT_QUESTION updates the current question index', () => {
    const result = questionnaireReducer(initialState, {
      type: 'SET_CURRENT_QUESTION',
      payload: 5,
    })
    expect(result.currentQuestion).toBe(5)
  })

  it('UPDATE_ANSWERS appends an answer', () => {
    const result = questionnaireReducer(initialState, {
      type: 'UPDATE_ANSWERS',
      payload: { questionId: 1, responseId: 3 },
    })
    expect(result.answers).toEqual([{ questionId: 1, responseId: 3 }])

    const result2 = questionnaireReducer(result, {
      type: 'UPDATE_ANSWERS',
      payload: { questionId: 2, responseId: 1 },
    })
    expect(result2.answers).toHaveLength(2)
  })

  it('SET_RISK_RATING sets the integer rating', () => {
    const result = questionnaireReducer(initialState, {
      type: 'SET_RISK_RATING',
      payload: 4,
    })
    expect(result.riskRating).toBe(4)
  })

  it('SET_RISK_RATING_DESCRIPTION sets the description string', () => {
    const result = questionnaireReducer(initialState, {
      type: 'SET_RISK_RATING_DESCRIPTION',
      payload: 'Medium-Higher',
    })
    expect(result.riskRatingDescription).toBe('Medium-Higher')
  })

  it('RESET_FORM resets answers, currentQuestion, riskRating but keeps questions', () => {
    const populatedState: AppState = {
      questions: mockQuestions,
      currentQuestion: 10,
      answers: [{ questionId: 1, responseId: 2 }],
      riskRating: 3,
      riskRatingDescription: 'Medium',
      pdfUrl: 'https://example.com/pdf',
    }
    const result = questionnaireReducer(populatedState, { type: 'RESET_FORM' })
    expect(result.questions).toEqual(mockQuestions)
    expect(result.currentQuestion).toBe(1)
    expect(result.answers).toEqual([])
    expect(result.riskRating).toBeUndefined()
    expect(result.riskRatingDescription).toBeUndefined()
    expect(result.pdfUrl).toBe('https://example.com/pdf')
  })

  it('CREATE_PDF sets the pdfUrl', () => {
    const result = questionnaireReducer(initialState, {
      type: 'CREATE_PDF',
      payload: 'https://example.com/pdf',
    })
    expect(result.pdfUrl).toBe('https://example.com/pdf')
  })

  it('RESET_CREATE_PDF clears the pdfUrl', () => {
    const stateWithPdf = { ...initialState, pdfUrl: 'https://example.com/pdf' }
    const result = questionnaireReducer(stateWithPdf, { type: 'RESET_CREATE_PDF' })
    expect(result.pdfUrl).toBe('')
  })

  it('unknown action returns state unchanged', () => {
    const result = questionnaireReducer(initialState, { type: 'UNKNOWN' } as never)
    expect(result).toBe(initialState)
  })
})
