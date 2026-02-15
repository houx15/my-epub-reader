import React, { Component, ReactNode } from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary - Catches React errors and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReportIssue = () => {
    const issueUrl = 'https://github.com/anthropics/claude-code/issues';
    window.open(issueUrl, '_blank');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h1>Oops! Something went wrong</h1>
            <p className="error-message">
              The application encountered an unexpected error and needs to reload.
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre className="error-stack">
                  <strong>{this.state.error.toString()}</strong>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button className="btn-primary" onClick={this.handleReload}>
                🔄 Reload Application
              </button>
              <button className="btn-secondary" onClick={this.handleReportIssue}>
                📝 Report Issue
              </button>
            </div>

            <p className="error-hint">
              If this problem persists, try closing and reopening the application.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
