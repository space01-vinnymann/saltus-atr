import { calculateRiskScore } from './scoring'

interface AppSyncEvent {
  arguments: {
    responses: Array<{ questionId: string; responseId: string }>
  }
}

export const handler = async (event: AppSyncEvent) => {
  try {
    const { responses } = event.arguments
    const rating = calculateRiskScore(responses)
    return { rating }
  } catch (error) {
    console.error('Error calculating risk:', error)
    throw new Error('Unable to calculate risk rating. Please try again later.')
  }
}
