export interface QuestionData {
  id: number
  text: string
  answers: Array<{ id: number; text: string }>
}

export const questions: QuestionData[] = [
  {
    id: 1,
    text: 'I would enjoy exploring investment opportunities for my money.',
    answers: [
      { id: 1, text: 'Strongly agree' },
      { id: 2, text: 'Tend to agree' },
      { id: 3, text: 'In between' },
      { id: 4, text: 'Tend to disagree' },
      { id: 5, text: 'Strongly disagree' },
    ],
  },
  {
    id: 2,
    text: 'I would go for the best possible return even if there were risk involved.',
    answers: [
      { id: 1, text: 'Always' },
      { id: 2, text: 'Usually' },
      { id: 3, text: 'Sometimes' },
      { id: 4, text: 'Rarely' },
      { id: 5, text: 'Never' },
    ],
  },
  {
    id: 3,
    text: 'How would you describe your typical attitude when making important financial decisions?',
    answers: [
      { id: 1, text: 'Very adventurous' },
      { id: 2, text: 'Fairly adventurous' },
      { id: 3, text: 'Average' },
      { id: 4, text: 'Fairly cautious' },
      { id: 5, text: 'Very cautious' },
    ],
  },
  {
    id: 4,
    text: 'What amount of risk do you feel you have taken with your past financial decisions?',
    answers: [
      { id: 1, text: 'Very Large' },
      { id: 2, text: 'Large' },
      { id: 3, text: 'Medium' },
      { id: 4, text: 'Small' },
      { id: 5, text: 'Very small' },
    ],
  },
  {
    id: 5,
    text: 'To reach my financial goal I prefer an investment which is safe and grows slowly but steadily, even if it means lower growth overall.',
    answers: [
      { id: 1, text: 'Strongly agree' },
      { id: 2, text: 'Tend to agree' },
      { id: 3, text: 'In between' },
      { id: 4, text: 'Tend to disagree' },
      { id: 5, text: 'Strongly disagree' },
    ],
  },
  {
    id: 6,
    text: 'I am looking for high investment growth. I am willing to accept the possibility of greater losses to achieve this.',
    answers: [
      { id: 1, text: 'Strongly agree' },
      { id: 2, text: 'Tend to agree' },
      { id: 3, text: 'In between' },
      { id: 4, text: 'Tend to disagree' },
      { id: 5, text: 'Strongly disagree' },
    ],
  },
  {
    id: 7,
    text: 'If you had money to invest, how much would you be willing to place in an investment with possible high returns but a similar chance of losing some of your money?',
    answers: [
      { id: 1, text: 'All of it' },
      { id: 2, text: 'More than half' },
      { id: 3, text: 'Half' },
      { id: 4, text: 'Less than half' },
      { id: 5, text: 'Very little, if any' },
    ],
  },
  {
    id: 8,
    text: 'How do you think that a friend who knows you well would describe your attitude to taking financial risks?',
    answers: [
      { id: 1, text: 'Daring' },
      { id: 2, text: 'Sometimes daring' },
      { id: 3, text: 'A thoughtful risk taker' },
      { id: 4, text: 'Careful' },
      { id: 5, text: 'Very cautious and risk averse' },
    ],
  },
  {
    id: 9,
    text: 'If you had picked an investment with potential for large gains but also the risk of large losses how would you feel:',
    answers: [
      { id: 1, text: 'Panicked and very uncomfortable' },
      { id: 2, text: 'Quite uneasy' },
      { id: 3, text: 'A little concerned' },
      { id: 4, text: 'Accepting of the possible highs and lows' },
      { id: 5, text: 'Excited by the potential for gain' },
    ],
  },
  {
    id: 10,
    text: 'Imagine that you have some money to invest and a choice of two investment products, which option would you choose?',
    answers: [
      { id: 1, text: 'Low return, almost no risk' },
      { id: 2, text: 'Higher return, some risk' },
      { id: 3, text: 'A mixture of the two' },
    ],
  },
  {
    id: 11,
    text: 'I would prefer small certain gains to large uncertain ones.',
    answers: [
      { id: 1, text: 'Strongly agree' },
      { id: 2, text: 'Tend to agree' },
      { id: 3, text: 'In between' },
      { id: 4, text: 'Tend to disagree' },
      { id: 5, text: 'Strongly disagree' },
    ],
  },
  {
    id: 12,
    text: 'When considering a major financial decision, which statement BEST describes the way you think about the possible losses or the possible gains?',
    answers: [
      { id: 1, text: 'Excited about gains' },
      { id: 2, text: 'Optimistic about gains' },
      { id: 3, text: 'Think about both' },
      { id: 4, text: 'Conscious of losses' },
      { id: 5, text: 'Worry about losses' },
    ],
  },
  {
    id: 13,
    text: 'I want my investment money to be safe even if it means lower returns.',
    answers: [
      { id: 1, text: 'Strongly agree' },
      { id: 2, text: 'Tend to agree' },
      { id: 3, text: 'In between' },
      { id: 4, text: 'Tend to disagree' },
      { id: 5, text: 'Strongly disagree' },
    ],
  },
]
