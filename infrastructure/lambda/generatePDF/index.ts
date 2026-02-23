import { randomUUID } from 'crypto'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { questions } from './data'
import { compileTemplate } from './template'
import { storeTemplate, storeDocument, getDocumentUrl } from './s3Service'

interface RiskAnswer {
  questionId: number
  responseId: number
}

interface AppSyncEvent {
  arguments: {
    input: {
      RiskRating: string
      RiskAnswers: RiskAnswer[]
    }
  }
}

/** Escape a string for safe embedding inside a single-quoted JS string literal in a <script> block. */
function escapeForJsString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')     // escape backslashes first
    .replace(/'/g, "\\'")       // escape single quotes (JS string delimiter)
    .replace(/</g, '\\u003c')   // prevent </script> breakout
    .replace(/>/g, '\\u003e')   // extra safety
}

export const handler = async (event: AppSyncEvent) => {
  const bucket = process.env.PDF_BUCKET_NAME
  if (!bucket) throw new Error('PDF_BUCKET_NAME not set')

  try {
    const uuid = randomUUID()
    const { RiskRating, RiskAnswers } = event.arguments.input

    // Validate RiskRating is a known value (prevents HTML injection via unescaped template interpolation)
    if (!['1', '2', '3', '4', '5'].includes(RiskRating)) {
      throw new Error(`Invalid RiskRating: expected 1-5, got "${RiskRating}"`)
    }

    if (!Array.isArray(RiskAnswers) || RiskAnswers.length === 0) {
      throw new Error('RiskAnswers must be a non-empty array')
    }

    // Serialise questions and answers to JSON strings
    const questionsJson = JSON.stringify(questions)
    const answersJson = JSON.stringify(RiskAnswers)

    // Escape the JSON strings for safe embedding in a <script> block
    const RiskQuestionsString = escapeForJsString(questionsJson)
    const RiskAnswersString = escapeForJsString(answersJson)

    // Format date as dd/mm/yyyy
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    // Compile HTML template
    const html = compileTemplate({
      RiskRating,
      RiskQuestionsString,
      RiskAnswersString,
      date,
    })

    // Store debug HTML in S3 (only when DEBUG_PDF is enabled)
    if (process.env.DEBUG_PDF) {
      await storeTemplate(bucket, `${uuid}_debug.html`, html)
    }

    // Launch headless Chromium and generate PDF
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      printBackground: true,
    })

    await browser.close()

    // Store PDF in S3
    const pdfFilename = `${uuid}.pdf`
    await storeDocument(bucket, pdfFilename, Buffer.from(pdfBuffer))

    // Generate presigned URL
    const url = await getDocumentUrl(bucket, pdfFilename)

    return { url }
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Unable to generate PDF. Please try again later.')
  }
}
