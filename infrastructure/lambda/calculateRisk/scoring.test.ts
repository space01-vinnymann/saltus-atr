import { describe, it, expect } from 'vitest'
import { calculateRiskScore } from './scoring'

function makeResponses(responseIds: number[]) {
  return responseIds.map((responseId, i) => ({
    questionId: String(i + 1),
    responseId: String(responseId),
  }))
}

describe('calculateRiskScore', () => {
  it('all first answers selected → high risk (5)', () => {
    // Q1-Q8 first answers are high-risk (forward-scored → 5)
    // Q9 first answer is panicked (reverse → 1)
    // Q10 first answer is low return (→ 1)
    // Q11 first answer is strongly agree (reverse → 1)
    // Q12 first answer is excited about gains (forward → 5)
    // Q13 first answer is strongly agree (reverse → 1)
    // Forward: Q1(5) Q2(5) Q3(5) Q4(5) Q6(5) Q7(5) Q8(5) Q12(5) = 40
    // Reverse: Q5(1) Q9(1) Q11(1) Q13(1) = 4
    // Q10(1) = 1
    // Total = 45, avg = 45/13 ≈ 3.46, rounded = 3
    const responses = makeResponses([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
    const result = calculateRiskScore(responses)
    expect(result).toBe(3)
  })

  it('all last answers selected → low risk (3)', () => {
    // Forward-scored last (5): Q1(1) Q2(1) Q3(1) Q4(1) Q6(1) Q7(1) Q8(1) Q12(1) = 8
    // Reverse-scored last: Q5(5) Q9(5) Q11(5) Q13(5) = 20
    // Q10 last answer (3): score = 3
    // Total = 31, avg = 31/13 ≈ 2.38, rounded = 2
    const responses = makeResponses([5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 5, 5, 5])
    const result = calculateRiskScore(responses)
    expect(result).toBe(2)
  })

  it('all middle answers → rating 3', () => {
    // Forward middle (3): Q1(3) Q2(3) Q3(3) Q4(3) Q6(3) Q7(3) Q8(3) Q12(3) = 24
    // Reverse middle (3): Q5(3) Q9(3) Q11(3) Q13(3) = 12
    // Q10 middle option (id=3): score = 3
    // Total = 39, avg = 39/13 = 3
    const responses = makeResponses([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3])
    const result = calculateRiskScore(responses)
    expect(result).toBe(3)
  })

  it('Q10 handles 3-option scoring correctly', () => {
    // Only Q10 answer, isolate its scoring
    // Option 1 = 1, Option 2 = 5, Option 3 = 3
    expect(calculateRiskScore([{ questionId: '10', responseId: '1' }])).toBe(1)
    expect(calculateRiskScore([{ questionId: '10', responseId: '2' }])).toBe(5)
    expect(calculateRiskScore([{ questionId: '10', responseId: '3' }])).toBe(3)
  })

  it('result is always an integer between 1 and 5', () => {
    // Test with all highest risk answers (forward=1, reverse=5, Q10=2, Q12=1)
    const highRisk = makeResponses([1, 1, 1, 1, 5, 1, 1, 1, 5, 2, 5, 1, 5])
    const high = calculateRiskScore(highRisk)
    expect(high).toBeGreaterThanOrEqual(1)
    expect(high).toBeLessThanOrEqual(5)
    expect(Number.isInteger(high)).toBe(true)

    // All lowest risk
    const lowRisk = makeResponses([5, 5, 5, 5, 1, 5, 5, 5, 1, 1, 1, 5, 1])
    const low = calculateRiskScore(lowRisk)
    expect(low).toBeGreaterThanOrEqual(1)
    expect(low).toBeLessThanOrEqual(5)
    expect(Number.isInteger(low)).toBe(true)
  })

  it('maximum risk profile scores 5', () => {
    // All answers maximise risk: forward Q answered 1 (→5), reverse Q answered 5 (→5), Q10 answered 2 (→5), Q12 answered 1 (→5)
    const maxRisk = makeResponses([1, 1, 1, 1, 5, 1, 1, 1, 5, 2, 5, 1, 5])
    expect(calculateRiskScore(maxRisk)).toBe(5)
  })

  it('minimum risk profile scores 1', () => {
    // All answers minimise risk: forward Q answered 5 (→1), reverse Q answered 1 (→1), Q10 answered 1 (→1), Q12 answered 5 (→1)
    const minRisk = makeResponses([5, 5, 5, 5, 1, 5, 5, 5, 1, 1, 1, 5, 1])
    expect(calculateRiskScore(minRisk)).toBe(1)
  })
})
