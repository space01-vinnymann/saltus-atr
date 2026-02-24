interface AppSyncPipelineEvent {
  prev: {
    result: {
      access_token: string
    }
  }
  arguments: {
    responses: Array<{ questionId: string; responseId: string }>
  }
}

export const handler = async (event: AppSyncPipelineEvent) => {
  const accessToken = event.prev?.result?.access_token
  if (!accessToken) {
    throw new Error('Missing EValue access token')
  }

  const baseUrl = process.env.EVALUE_API_BASE_URL
  if (!baseUrl) {
    throw new Error('EVALUE_API_BASE_URL environment variable is not set')
  }

  const { responses } = event.arguments

  const response = await fetch(
    `${baseUrl}/riskQuestionnaire/1.0.0/riskProfiler/calculateRisk`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        responses: responses.map((r) => ({
          questionId: String(r.questionId),
          responseId: String(r.responseId),
        })),
        questionnaireName: '5risk',
        term: 15,
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    console.error(
      `EValue calculateRisk failed: status=${response.status}, body=${body}`
    )
    throw new Error('Failed to calculate risk rating')
  }

  const data: any = await response.json()

  if (typeof data?.riskProfile !== 'number') {
    console.error('EValue returned unexpected response shape:', JSON.stringify(data))
    throw new Error('EValue returned an unexpected response — service may be unavailable')
  }

  const clamped = Math.max(1, Math.min(5, parseInt(String(data.riskProfile))))

  return { rating: clamped }
}
