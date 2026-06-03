"use client";
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
  componentDidCatch(error: Error, info: { componentStack: string }): void {
    if (process.env.NODE_ENV !== "production") console.error(error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="flex flex-col items-center justify-center min-h-32 text-red-500 text-sm px-4 text-center gap-2">
          <span>Something went wrong loading this section.</span>
          <button
            onClick={() => this.setState({ error: null })}
            aria-label="Try again loading this section"
            className="text-xs underline mt-1 focus:outline-none focus:ring-2 focus:ring-slate-500 rounded"
          >
            Try again
          </button>
          {process.env.NODE_ENV !== "production" && (
            <pre className="text-xs text-left whitespace-pre-wrap opacity-70 max-w-full overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
