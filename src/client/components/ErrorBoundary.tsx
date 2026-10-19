import { Component, type ReactNode } from "react";

/** Keep unexpected rendering failures out of the credential and data views. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="login-form" role="alert">
        <p className="eyebrow">WORKSPACE RECOVERY</p>
        <h1>Something interrupted this view.</h1>
        <p className="muted">
          Reload to clear the in-memory session and reconnect securely. Unsaved
          form input will be discarded.
        </p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Reload and reconnect
        </button>
      </main>
    );
  }
}
