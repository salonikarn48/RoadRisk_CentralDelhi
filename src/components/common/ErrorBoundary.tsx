import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  moduleName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary - ${this.props.moduleName || "Module"}]`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[220px] rounded-xl bg-[#091D33] border border-red-500/40 p-6 flex flex-col items-center justify-center text-center shadow-lg">
          <div className="w-10 h-10 rounded-full bg-red-950/80 border border-red-500/60 flex items-center justify-center text-red-400 mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            {this.props.moduleName ? `${this.props.moduleName} Error` : "Rendering Interrupted"}
          </h3>
          <div className="text-xs text-red-200 bg-red-950/40 border border-red-900/50 p-2.5 rounded-lg max-w-lg mb-4 text-left font-mono break-words overflow-auto max-h-36">
            <strong>Error: </strong>{this.state.error?.message || "Unknown rendering exception"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-3.5 py-1.5 rounded-lg bg-[#0E7490] hover:bg-[#0891B2] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Component</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
