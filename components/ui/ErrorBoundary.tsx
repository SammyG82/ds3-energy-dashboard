"use client";
import { Component, Fragment, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; resetKey: number; retries: number; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, resetKey: 0, retries: 0 };
  }
  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)), retries: 0 };
  }
  componentDidCatch(error: Error, info: { componentStack: string }): void {
    if (process.env.NODE_ENV !== "production") console.error(error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="flex flex-col items-center justify-center min-h-32 text-red-600 dark:text-red-400 text-sm px-4 text-center gap-2">
          <span>Something went wrong loading this section.</span>
          {this.state.retries < 2 ? (
            <button
              onClick={() => this.setState((s) => ({ error: null, resetKey: s.resetKey + 1, retries: s.retries + 1 }))}
              aria-label="Try again loading this section"
              className="text-xs underline mt-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-white focus:ring-offset-white dark:focus:ring-offset-black rounded"
            >
              Try again
            </button>
          ) : (
            <p className="text-xs mt-1 opacity-70">Please refresh the page to reload this section.</p>
          )}
          {process.env.NODE_ENV !== "production" && (
            <pre className="text-xs text-left whitespace-pre-wrap opacity-70 max-w-full overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
