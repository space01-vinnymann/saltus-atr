import { createContext, useContext, useReducer, type ReactNode } from 'react'
import { questionnaireReducer, initialState } from './questionnaireReducer'
import type { AppState, Action } from './types'

interface QuestionnaireContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const QuestionnaireContext = createContext<QuestionnaireContextValue | null>(null)

export function QuestionnaireProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(questionnaireReducer, initialState)

  return (
    <QuestionnaireContext.Provider value={{ state, dispatch }}>
      {children}
    </QuestionnaireContext.Provider>
  )
}

export function useQuestionnaire(): QuestionnaireContextValue {
  const context = useContext(QuestionnaireContext)
  if (!context) {
    throw new Error('useQuestionnaire must be used within a QuestionnaireProvider')
  }
  return context
}
