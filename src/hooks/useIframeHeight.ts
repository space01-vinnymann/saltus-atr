import { useEffect } from 'react'

export function useIframeHeight() {
  useEffect(() => {
    const interval = setInterval(() => {
      const height = document.documentElement.scrollHeight
      window.parent.postMessage(['setHeight', height], '*')
    }, 200)

    return () => clearInterval(interval)
  }, [])
}
