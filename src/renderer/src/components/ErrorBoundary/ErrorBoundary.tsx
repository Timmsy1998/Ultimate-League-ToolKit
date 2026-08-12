import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
  // Called on retry, before the caught error is cleared — lets the parent
  // reset any state that might have caused the crash in the first place.
  onReset?: () => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry/crash reporting in this app by design — this is the
    // extent of visibility a dev gets, via the renderer devtools console.
    console.error('Unhandled error in renderer:', error, info.componentStack)
  }

  private handleReset = (): void => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className={styles.wrap}>
        <AlertTriangle size={28} strokeWidth={1.5} className={styles.icon} aria-hidden="true" />
        <p className={styles.title}>Something went wrong</p>
        <p className={styles.description}>
          This page hit an unexpected error. You can try again, or switch to another page from the sidebar.
        </p>
        <button type="button" className={styles.retryButton} onClick={this.handleReset}>
          <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
          Try again
        </button>
        {import.meta.env.DEV ? <pre className={styles.details}>{error.stack ?? error.message}</pre> : null}
      </div>
    )
  }
}
