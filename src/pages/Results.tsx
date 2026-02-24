import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import axios from 'axios'
import { saveAs } from 'file-saver'
import { useQuestionnaire } from '../context/QuestionnaireContext'
import { CALCULATE_RISK, GENERATE_PDF } from '../graphql/mutations'
import { getRiskRating } from '../utils/riskRatings'

interface CalculateRiskData {
  calculateRisk: { rating: number }
}

interface GeneratePdfData {
  generateRiskResultPDF: { url: string }
}


export default function Results() {
  const navigate = useNavigate()
  const { state, dispatch } = useQuestionnaire()
  const [calculateRisk] = useMutation<CalculateRiskData>(CALCULATE_RISK)
  const [generatePdf] = useMutation<GeneratePdfData>(GENERATE_PDF)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState(false)

  // Guard: redirect if no questions loaded (e.g. direct page load)
  useEffect(() => {
    if (state.questions.length === 0) {
      navigate('/', { replace: true })
    }
  }, [state.questions.length, navigate])

  // Calculate risk on mount when answers are complete
  useEffect(() => {
    if (
      state.answers.length === state.questions.length &&
      state.questions.length > 0 &&
      state.riskRating === undefined
    ) {
      calculateRisk({ variables: { responses: state.answers } })
        .then((result) => {
          const rating = result.data?.calculateRisk?.rating
          if (rating == null) throw new Error('No risk rating returned')
          dispatch({ type: 'SET_RISK_RATING', payload: rating })
          const ratingInfo = getRiskRating(rating)
          if (ratingInfo) {
            dispatch({
              type: 'SET_RISK_RATING_DESCRIPTION',
              payload: ratingInfo.description,
            })
          }
        })
        .catch(() => {
          navigate('/error')
        })
    }
  }, [state.answers, state.questions, state.riskRating, calculateRisk, dispatch, navigate])

  const handleRetake = () => {
    dispatch({ type: 'RESET_FORM' })
    dispatch({ type: 'RESET_CREATE_PDF' })
    navigate('/questionnaire')
  }

  const handleDownloadPdf = async () => {
    if (!state.riskRating) return
    setDownloadingPdf(true)
    setPdfError(false)
    try {
      const result = await generatePdf({
        variables: {
          input: {
            RiskRating: String(state.riskRating),
            RiskAnswers: state.answers,
            RiskQuestions: state.questions.map((q) => ({
              questionId: parseInt(q.id),
              questionText: q.text,
              responses: q.answers.map((a) => ({
                responseId: parseInt(a.id),
                responseText: a.text,
              })),
            })),
          },
        },
      })
      const url = result.data?.generateRiskResultPDF?.url
      if (!url) throw new Error('No PDF URL returned')
      dispatch({ type: 'CREATE_PDF', payload: url })
      const response = await axios.get(url, { responseType: 'blob' })
      saveAs(response.data as Blob, 'risk-results.pdf')
    } catch {
      setPdfError(true)
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (state.questions.length === 0) return null

  const ratingInfo = state.riskRating ? getRiskRating(state.riskRating) : undefined

  // Loading state while calculating risk
  if (state.riskRating === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-coral" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg rounded-card bg-panel p-8 text-center shadow-card sm:p-10">
      {/* Rating circle */}
      <div className="mx-auto mb-6 flex h-28 w-28 flex-col items-center justify-center rounded-full border-3 border-coral bg-muted">
        <span className="font-heading text-4xl font-bold text-foreground">
          {state.riskRating}
        </span>
        <span className="font-body text-xs text-muted-fg">of 5</span>
      </div>

      <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
        {ratingInfo?.label} Risk
      </h2>

      <p className="mb-7 font-body text-sm leading-relaxed text-muted-fg">
        {state.riskRatingDescription}
      </p>

      {/* Risk scale bar */}
      <div className="mb-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded-full ${
              level < (state.riskRating ?? 0) ? 'bg-green' :
              level === state.riskRating ? 'bg-coral' :
              'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="mb-7 flex justify-between">
        <span className="font-body text-[11px] text-muted-fg">Lower Risk</span>
        <span className="font-body text-[11px] text-muted-fg">Higher Risk</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleRetake}
          className="flex flex-1 items-center justify-center gap-2 rounded-pill border border-border-clr px-4 py-3 font-body text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" /></svg>
          Retake
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="flex flex-1 items-center justify-center gap-2 rounded-pill bg-coral px-4 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-coral/90 disabled:opacity-60"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3" /></svg>
          {downloadingPdf ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>

      {pdfError && (
        <p className="mt-4 font-body text-sm text-coral">
          Unable to download PDF. Please try again.
        </p>
      )}
    </div>
  )
}
