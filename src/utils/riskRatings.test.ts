import { getRiskRating, riskRatings } from './riskRatings'

describe('riskRatings', () => {
  it('contains entries for ratings 1 through 5', () => {
    expect(Object.keys(riskRatings)).toHaveLength(5)
    for (let i = 1; i <= 5; i++) {
      expect(riskRatings[i]).toBeDefined()
    }
  })

  it.each([
    [1, 'Lower'],
    [2, 'Lower-Medium'],
    [3, 'Medium'],
    [4, 'Medium-Higher'],
    [5, 'Higher'],
  ])('rating %i has label "%s"', (rating, expectedLabel) => {
    expect(getRiskRating(rating)?.label).toBe(expectedLabel)
  })

  it.each([
    [1, 'Conservative, short-term changes for modest/stable returns'],
    [2, 'Cautious, reasonable long-term returns, accept some risk'],
    [3, 'Balanced, accepts fluctuations for better long-term returns'],
    [4, 'Comfortable with risk for higher long-term returns'],
    [5, 'Very comfortable, aiming for high long-term returns'],
  ])('rating %i has correct description', (rating, expectedDesc) => {
    expect(getRiskRating(rating)?.description).toBe(expectedDesc)
  })

  it('returns undefined for out-of-range ratings', () => {
    expect(getRiskRating(0)).toBeUndefined()
    expect(getRiskRating(6)).toBeUndefined()
    expect(getRiskRating(-1)).toBeUndefined()
  })
})
