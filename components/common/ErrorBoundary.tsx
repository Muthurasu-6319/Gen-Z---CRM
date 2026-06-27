// src/components/common/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // --- THIS IS THE CRITICAL DEBUGGING CHANGE ---
    // Log the actual error to the console so we can see what's happening.
    console.error("--- ErrorBoundary caught an error ---", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (React.isValidElement(this.props.fallback)) {
        return React.cloneElement(this.props.fallback as React.ReactElement, {
           children: [
             (this.props.fallback as React.ReactElement).props.children,
             <div key="err" className="mt-4 p-4 bg-red-100 text-red-800 text-left text-sm max-w-2xl overflow-auto border border-red-300 rounded">
                 <strong>Error Details:</strong>
                 <pre className="mt-2 whitespace-pre-wrap font-mono">{this.state.errorMsg || 'Unknown error'}</pre>
             </div>
           ]
        });
      }
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;