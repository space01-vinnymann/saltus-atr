import { useEffect } from 'react'

const parentOrigin = import.meta.env.VITE_PARENT_ORIGIN || '*'

export function useIframeHeight() {
  useEffect(() => {
    const interval = setInterval(() => {
      const height = document.documentElement.scrollHeight
      window.parent.postMessage(['setHeight', height], parentOrigin)
    }, 200)

    return () => clearInterval(interval)
  }, [])
}
