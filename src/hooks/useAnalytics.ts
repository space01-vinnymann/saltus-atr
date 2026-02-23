// Stubbed analytics hook for demo purposes.
// Can be wired to Google Tag Manager later by replacing the no-op with real GTM calls.
export function useAnalytics() {
  function trackEvent(action: string, label: string) {
    if (import.meta.env.DEV) {
      console.log('[Analytics]', action, label)
    }
  }

  return { trackEvent }
}
