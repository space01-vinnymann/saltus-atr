import { questions } from './data'

export const handler = async () => {
  try {
    return questions.map((q) => ({
      id: String(q.id),
      text: q.text,
      answers: q.answers.map((a) => ({
        id: String(a.id),
        text: a.text,
      })),
    }))
  } catch (error) {
    console.error('Error fetching questions:', error)
    throw new Error('Unable to retrieve questions. Please try again later.')
  }
}
