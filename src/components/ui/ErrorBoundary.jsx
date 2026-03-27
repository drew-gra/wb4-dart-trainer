import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-300 mb-4">Something went wrong.</p>
          <button
            onClick={this.handleReset}
            className="text-yellow-400 font-bold border border-yellow-400/50 rounded px-4 py-2 hover:bg-yellow-400/10 transition-colors"
          >
            Back to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
