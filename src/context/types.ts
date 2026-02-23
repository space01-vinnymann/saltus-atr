export interface Answer {
  id: string
  text: string
}

export interface Question {
  id: string
  text: string
  answers: Answer[]
}

export interface UserResponse {
  questionId: number
  responseId: number
}

export interface AppState {
  questions: Question[]
  currentQuestion: number
  answers: UserResponse[]
  riskRating?: number
  riskRatingDescription?: string
  pdfUrl: string
}

export type Action =
  | { type: 'SET_QUESTIONS'; payload: Question[] }
  | { type: 'SET_CURRENT_QUESTION'; payload: number }
  | { type: 'UPDATE_ANSWERS'; payload: UserResponse }
  | { type: 'SET_RISK_RATING'; payload: number }
  | { type: 'SET_RISK_RATING_DESCRIPTION'; payload: string }
  | { type: 'RESET_FORM' }
  | { type: 'CREATE_PDF'; payload: string }
  | { type: 'RESET_CREATE_PDF' }
