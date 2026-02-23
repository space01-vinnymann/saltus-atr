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

import riskRating1 from '../assets/risk-rating-1.svg'
import riskRating2 from '../assets/risk-rating-2.svg'
import riskRating3 from '../assets/risk-rating-3.svg'
import riskRating4 from '../assets/risk-rating-4.svg'
import riskRating5 from '../assets/risk-rating-5.svg'

const riskRatingImages: Record<number, string> = {
  1: riskRating1,
  2: riskRating2,
  3: riskRating3,
  4: riskRating4,
  5: riskRating5,
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
  const ratingImage = state.riskRating ? riskRatingImages[state.riskRating] : undefined

  // Loading state while calculating risk
  if (state.riskRating === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-light-grey border-t-teal" />
      </div>
    )
  }

  return (
    <div>
      {ratingImage && (
        <img
          src={ratingImage}
          alt={`Risk rating ${state.riskRating}`}
          className="mx-auto mb-6 h-28 w-28"
        />
      )}

      <h2 className="mb-2 font-heading text-2xl text-navy">
        Your risk level is {ratingInfo?.label}
      </h2>

      <p className="mb-8 font-body text-base text-grey">
        {state.riskRatingDescription}
      </p>

      <button
        onClick={handleRetake}
        className="rounded-pill border-2 border-navy bg-transparent px-8 py-3 font-body text-base font-medium text-navy transition-colors hover:bg-navy hover:text-white"
      >
        Retake the test
      </button>

      <h2 className="mb-4 mt-10 font-heading text-2xl text-navy">Next Steps</h2>

      <div className="mb-6 rounded-card bg-white p-6 shadow-card">
        <p className="font-body text-base text-navy">
          Download the results and email to your adviser.
        </p>
      </div>

      <button
        onClick={handleDownloadPdf}
        disabled={downloadingPdf}
        className="rounded-pill bg-teal px-8 py-3 font-body text-base font-medium text-navy transition-colors hover:bg-teal/80 disabled:opacity-60"
      >
        {downloadingPdf ? 'Downloading PDF...' : 'Download PDF'}
      </button>

      {pdfError && (
        <p className="mt-4 font-body text-sm text-coral">
          Unable to download PDF. Please try again.
        </p>
      )}
    </div>
  )
}
