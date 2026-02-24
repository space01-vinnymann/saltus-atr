import { describe, it, expect } from 'vitest'
import { compileTemplate } from './template'
import { mediumRiskAnswers, highRiskAnswers, lowRiskAnswers } from './__fixtures__/mockAnswers'

// Questions are now passed from the frontend via GraphQL input.
// For tests, we define the same 13-question dataset inline.
const questions = [
  { id: 1, text: 'I would enjoy exploring investment opportunities for my money.', answers: [{ id: 1, text: 'Strongly agree' }, { id: 2, text: 'Tend to agree' }, { id: 3, text: 'In between' }, { id: 4, text: 'Tend to disagree' }, { id: 5, text: 'Strongly disagree' }] },
  { id: 2, text: 'I would go for the best possible return even if there were risk involved.', answers: [{ id: 1, text: 'Always' }, { id: 2, text: 'Usually' }, { id: 3, text: 'Sometimes' }, { id: 4, text: 'Rarely' }, { id: 5, text: 'Never' }] },
  { id: 3, text: 'How would you describe your typical attitude when making important financial decisions?', answers: [{ id: 1, text: 'Very adventurous' }, { id: 2, text: 'Fairly adventurous' }, { id: 3, text: 'Average' }, { id: 4, text: 'Fairly cautious' }, { id: 5, text: 'Very cautious' }] },
  { id: 4, text: 'What amount of risk do you feel you have taken with your past financial decisions?', answers: [{ id: 1, text: 'Very Large' }, { id: 2, text: 'Large' }, { id: 3, text: 'Medium' }, { id: 4, text: 'Small' }, { id: 5, text: 'Very small' }] },
  { id: 5, text: 'To reach my financial goal I prefer an investment which is safe and grows slowly but steadily, even if it means lower growth overall.', answers: [{ id: 1, text: 'Strongly agree' }, { id: 2, text: 'Tend to agree' }, { id: 3, text: 'In between' }, { id: 4, text: 'Tend to disagree' }, { id: 5, text: 'Strongly disagree' }] },
  { id: 6, text: 'I am looking for high investment growth. I am willing to accept the possibility of greater losses to achieve this.', answers: [{ id: 1, text: 'Strongly agree' }, { id: 2, text: 'Tend to agree' }, { id: 3, text: 'In between' }, { id: 4, text: 'Tend to disagree' }, { id: 5, text: 'Strongly disagree' }] },
  { id: 7, text: 'If you had money to invest, how much would you be willing to place in an investment with possible high returns but a similar chance of losing some of your money?', answers: [{ id: 1, text: 'All of it' }, { id: 2, text: 'More than half' }, { id: 3, text: 'Half' }, { id: 4, text: 'Less than half' }, { id: 5, text: 'Very little, if any' }] },
  { id: 8, text: 'How do you think that a friend who knows you well would describe your attitude to taking financial risks?', answers: [{ id: 1, text: 'Daring' }, { id: 2, text: 'Sometimes daring' }, { id: 3, text: 'A thoughtful risk taker' }, { id: 4, text: 'Careful' }, { id: 5, text: 'Very cautious and risk averse' }] },
  { id: 9, text: 'If you had picked an investment with potential for large gains but also the risk of large losses how would you feel:', answers: [{ id: 1, text: 'Panicked and very uncomfortable' }, { id: 2, text: 'Quite uneasy' }, { id: 3, text: 'A little concerned' }, { id: 4, text: 'Accepting of the possible highs and lows' }, { id: 5, text: 'Excited by the potential for gain' }] },
  { id: 10, text: 'Imagine that you have some money to invest and a choice of two investment products, which option would you choose?', answers: [{ id: 1, text: 'Low return, almost no risk' }, { id: 2, text: 'Higher return, some risk' }, { id: 3, text: 'A mixture of the two' }] },
  { id: 11, text: 'I would prefer small certain gains to large uncertain ones.', answers: [{ id: 1, text: 'Strongly agree' }, { id: 2, text: 'Tend to agree' }, { id: 3, text: 'In between' }, { id: 4, text: 'Tend to disagree' }, { id: 5, text: 'Strongly disagree' }] },
  { id: 12, text: 'When considering a major financial decision, which statement BEST describes the way you think about the possible losses or the possible gains?', answers: [{ id: 1, text: 'Excited about gains' }, { id: 2, text: 'Optimistic about gains' }, { id: 3, text: 'Think about both' }, { id: 4, text: 'Conscious of losses' }, { id: 5, text: 'Worry about losses' }] },
  { id: 13, text: 'I want my investment money to be safe even if it means lower returns.', answers: [{ id: 1, text: 'Strongly agree' }, { id: 2, text: 'Tend to agree' }, { id: 3, text: 'In between' }, { id: 4, text: 'Tend to disagree' }, { id: 5, text: 'Strongly disagree' }] },
]

function renderTemplate(rating: string, answers = mediumRiskAnswers) {
  return compileTemplate({
    RiskRating: rating,
    RiskQuestionsString: JSON.stringify(questions),
    RiskAnswersString: JSON.stringify(answers),
    date: '24/02/2026',
  })
}

describe('compileTemplate', () => {
  it('returns valid HTML with doctype', () => {
    const html = renderTemplate('3')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('</html>')
  })

  it('includes the Roboto font stylesheet', () => {
    const html = renderTemplate('3')
    expect(html).toContain('fonts.googleapis.com/css2?family=Roboto')
  })

  it('embeds the Saltus logo SVG', () => {
    const html = renderTemplate('3')
    // Logo should appear in page headers and footers
    expect(html).toContain('viewBox="0 0 995 246"')
    // Page 1 header + footer = 2, questions section header + footer = 2 → 4 logos
    const logoCount = (html.match(/viewBox="0 0 995 246"/g) || []).length
    expect(logoCount).toBe(4)
  })

  it('includes the date', () => {
    const html = renderTemplate('3')
    expect(html).toContain('24/02/2026')
  })

  describe('risk labels and descriptions', () => {
    const cases: Array<{ rating: string; label: string; descSnippet: string }> = [
      { rating: '1', label: 'Lower Risk', descSnippet: 'more conservative' },
      { rating: '2', label: 'Lower-Medium Risk', descSnippet: 'relatively cautious' },
      { rating: '3', label: 'Medium Risk', descSnippet: 'balanced approach' },
      { rating: '4', label: 'Medium-Higher Risk', descSnippet: 'comfortable taking some investment risk' },
      { rating: '5', label: 'Higher Risk', descSnippet: 'very comfortable taking investment risk' },
    ]

    cases.forEach(({ rating, label, descSnippet }) => {
      it(`rating ${rating} shows "${label}" and correct description`, () => {
        const html = renderTemplate(rating)
        expect(html).toContain(label)
        expect(html).toContain(descSnippet)
      })
    })

    it('unknown rating defaults to "Unknown"', () => {
      const html = renderTemplate('9')
      expect(html).toContain('Unknown Risk')
    })
  })

  describe('risk scale bar', () => {
    it('rating 1 — first segment active, none below', () => {
      const html = renderTemplate('1')
      expect(html).toContain('scale-segment active')
      expect(html).not.toContain('scale-segment below')
    })

    it('rating 3 — two segments below, one active, two plain', () => {
      const html = renderTemplate('3')
      const belowCount = (html.match(/scale-segment below/g) || []).length
      const activeCount = (html.match(/scale-segment active/g) || []).length
      expect(belowCount).toBe(2)
      expect(activeCount).toBe(1)
    })

    it('rating 5 — four segments below, one active', () => {
      const html = renderTemplate('5')
      const belowCount = (html.match(/scale-segment below/g) || []).length
      const activeCount = (html.match(/scale-segment active/g) || []).length
      expect(belowCount).toBe(4)
      expect(activeCount).toBe(1)
    })

    it('always renders exactly 5 scale segments', () => {
      const html = renderTemplate('3')
      // Match the opening div tags — each class string contains "scale-segment"
      // plus optionally " below" or " active", so count distinct divs
      const segmentCount = (html.match(/class="scale-segment(?:\s(?:below|active))?"/g) || []).length
      expect(segmentCount).toBe(5)
    })
  })

  describe('rating circle', () => {
    it('displays the rating number', () => {
      const html = renderTemplate('4')
      expect(html).toContain('<span class="rating-number">4</span>')
    })

    it('displays "of 5" subtext', () => {
      const html = renderTemplate('3')
      expect(html).toContain('of 5')
    })
  })

  describe('questions and answers (client-side rendered)', () => {
    // Questions are rendered by a <script> block at runtime, not in the
    // static HTML. We test that the data is correctly embedded.

    it('embeds all question JSON data in the script block', () => {
      const html = renderTemplate('3')
      // The script parses the JSON — verify all 13 questions are present
      questions.forEach((q) => {
        expect(html).toContain(q.text)
      })
    })

    it('embeds answer JSON data in the script block', () => {
      const html = renderTemplate('3', mediumRiskAnswers)
      // Check the answers JSON is embedded (responseId values)
      mediumRiskAnswers.forEach((a) => {
        expect(html).toContain(`"questionId":${a.questionId}`)
        expect(html).toContain(`"responseId":${a.responseId}`)
      })
    })

    it('contains the buildQuestionHtml function', () => {
      const html = renderTemplate('3')
      // The JS function that generates question items at runtime
      expect(html).toContain('buildQuestionHtml')
      expect(html).toContain('question-number')
    })

    it('has empty question list container for JS to populate', () => {
      const html = renderTemplate('3')
      expect(html).toContain('class="question-list all-questions"')
    })

    it('populates all questions into a single list', () => {
      const html = renderTemplate('3')
      expect(html).toContain('.all-questions')
    })
  })

  describe('page structure', () => {
    it('has results page with forced page break followed by flowing questions section', () => {
      const html = renderTemplate('3')
      // Page 1 is the only fixed page; questions flow naturally
      const pageCount = (html.match(/class="page"/g) || []).length
      expect(pageCount).toBe(1)
    })

    it('page 1 has results title', () => {
      const html = renderTemplate('3')
      expect(html).toContain('Attitude to Risk')
    })

    it('questions section shows title and subtitle', () => {
      const html = renderTemplate('3')
      expect(html).toContain('Your Questions &amp; Answers')
      expect(html).toContain('13 questions')
    })
  })

  describe('different answer sets', () => {
    it('renders with low-risk answers without errors', () => {
      expect(() => renderTemplate('1', lowRiskAnswers)).not.toThrow()
    })

    it('renders with high-risk answers without errors', () => {
      expect(() => renderTemplate('5', highRiskAnswers)).not.toThrow()
    })
  })
})
