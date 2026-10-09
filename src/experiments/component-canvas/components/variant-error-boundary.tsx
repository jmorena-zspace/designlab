import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT ERROR BOUNDARY: keeps one broken component from crashing the canvas.
//
// Real components imported from another project may call APIs, need a router or
// store provider, or read env variables. Without their placeholder data they throw.
// This boundary catches that and shows a quiet "Needs placeholder data" card in the
// variant's spot, while every other variant keeps working.
//
// WHY A CLASS COMPONENT: React only lets class components catch render errors
// (through `getDerivedStateFromError` / `componentDidCatch`). There is no hook for it
// yet, so this is the one place in the experiment that uses a class.
// ─────────────────────────────────────────────────────────────────────────────

type VariantErrorBoundaryProps = {
  // When this value changes (e.g. the user edited the variant), we try rendering again.
  resetKey: string
  children: ReactNode
}

type VariantErrorBoundaryState = {
  error: Error | null
  resetKey: string // the resetKey the error belongs to
}

export class VariantErrorBoundary extends Component<VariantErrorBoundaryProps, VariantErrorBoundaryState> {
  state: VariantErrorBoundaryState = { error: null, resetKey: this.props.resetKey }

  // Before every render: if the variant changed since it crashed, forget the error so
  // React tries rendering it again.
  static getDerivedStateFromProps(
    props: VariantErrorBoundaryProps,
    state: VariantErrorBoundaryState,
  ): Partial<VariantErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  // Called by React when a child throws while rendering: remember the error.
  static getDerivedStateFromError(error: Error): Partial<VariantErrorBoundaryState> {
    return { error }
  }

  // Log it too, so the full stack shows up in the browser console.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Component canvas] A variant failed to render:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    // The fallback card. Its look lives in stage-chrome.css (.cc-error-card).
    return (
      <div className="cc-error-card" data-stage-chrome="">
        <div className="cc-error-title">Needs placeholder data</div>
        <div className="cc-error-message">{this.state.error.message}</div>
      </div>
    )
  }
}
