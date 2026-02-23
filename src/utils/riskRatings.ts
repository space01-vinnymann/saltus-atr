export const riskRatings: Record<number, { label: string; description: string }> = {
  1: {
    label: 'Lower',
    description: 'Conservative, short-term changes for modest/stable returns',
  },
  2: {
    label: 'Lower-Medium',
    description: 'Cautious, reasonable long-term returns, accept some risk',
  },
  3: {
    label: 'Medium',
    description: 'Balanced, accepts fluctuations for better long-term returns',
  },
  4: {
    label: 'Medium-Higher',
    description: 'Comfortable with risk for higher long-term returns',
  },
  5: {
    label: 'Higher',
    description: 'Very comfortable, aiming for high long-term returns',
  },
}

export function getRiskRating(rating: number): { label: string; description: string } | undefined {
  return riskRatings[rating]
}
