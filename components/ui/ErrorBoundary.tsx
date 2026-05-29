"use client";
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="flex items-center justify-center min-h-32 text-red-500 text-sm px-4 text-center">
          Something went wrong loading this section.
        </div>
      );
    }
    return this.props.children;
  }
}
