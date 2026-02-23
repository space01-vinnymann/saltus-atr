import type { AppState, Action } from './types'

export const initialState: AppState = {
  questions: [],
  currentQuestion: 1,
  answers: [],
  riskRating: undefined,
  riskRatingDescription: undefined,
  pdfUrl: '',
}

export function questionnaireReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_QUESTIONS':
      if (!state.questions) return state
      return { ...state, questions: action.payload }

    case 'SET_CURRENT_QUESTION':
      return { ...state, currentQuestion: action.payload }

    case 'UPDATE_ANSWERS':
      return { ...state, answers: [...state.answers, action.payload] }

    case 'SET_RISK_RATING':
      return { ...state, riskRating: action.payload }

    case 'SET_RISK_RATING_DESCRIPTION':
      return { ...state, riskRatingDescription: action.payload }

    case 'RESET_FORM':
      return {
        ...state,
        currentQuestion: 1,
        answers: [],
        riskRating: undefined,
        riskRatingDescription: undefined,
      }

    case 'CREATE_PDF':
      return { ...state, pdfUrl: action.payload }

    case 'RESET_CREATE_PDF':
      return { ...state, pdfUrl: '' }

    default:
      return state
  }
}
