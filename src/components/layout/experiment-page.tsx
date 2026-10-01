import type { ReactNode } from 'react'

// The shared frame for an experiment: fills the screen and centers whatever
// you put inside it, both horizontally and vertically.
export function ExperimentPage({ children }: { children: ReactNode }) {
  return <main className="flex min-h-svh items-center justify-center p-6">{children}</main>
}
