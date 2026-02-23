interface Response {
  questionId: string
  responseId: string
}

// Forward-scored: first answer = highest risk tolerance
// Q1,Q2,Q3,Q4,Q6,Q7,Q8: answer 1→5, 2→4, 3→3, 4→2, 5→1
const forwardScored = new Set([1, 2, 3, 4, 6, 7, 8])

// Reverse-scored: first answer = lowest risk tolerance
// Q5,Q11,Q13: answer 1→1, 2→2, 3→3, 4→4, 5→5
// Q9: also 1→1...5→5 (panicked=1, excited=5)
const reverseScored = new Set([5, 9, 11, 13])

// Q10: 3 options only — "Low return, almost no risk"=1, "Higher return, some risk"=5, "A mixture"=3
const q10ScoreMap: Record<number, number> = { 1: 1, 2: 5, 3: 3 }

// Q12: "Excited about gains"=5, "Optimistic"=4, "Think about both"=3, "Conscious of losses"=2, "Worry"=1
// Same as forward scoring: answer 1→5, 2→4, 3→3, 4→2, 5→1

export function calculateRiskScore(responses: Response[]): number {
  if (responses.length === 0) {
    throw new Error('No responses provided')
  }

  let total = 0

  for (const response of responses) {
    const questionId = parseInt(response.questionId, 10)
    const responseId = parseInt(response.responseId, 10)
    let score: number

    if (forwardScored.has(questionId)) {
      score = 6 - responseId
    } else if (reverseScored.has(questionId)) {
      score = responseId
    } else if (questionId === 10) {
      score = q10ScoreMap[responseId] ?? 3
    } else if (questionId === 12) {
      score = 6 - responseId
    } else {
      score = 3 // fallback
    }

    total += score
  }

  const average = total / responses.length
  const rounded = Math.round(average)
  return Math.max(1, Math.min(5, rounded))
}
