import type { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
