import React, { ReactNode, ErrorInfo } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function ClerkRouter({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY!} navigate={(to) => navigate(to)}>
      {children}
    </ClerkProvider>
  );
}

function ErrorFallback({ error }: { error: Error | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-xl w-full rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-700 mb-4">Application error</h1>
        <p className="text-sm text-gray-600 mb-4">The frontend failed to initialize correctly.</p>
        <pre className="whitespace-pre-wrap text-xs text-gray-800 bg-red-50 p-4 rounded-lg border border-red-100">
          {error?.message || String(error)}
        </pre>
      </div>
    </div>
  );
}

interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends React.Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    return this.state.error ? (
      <ErrorFallback error={this.state.error} />
    ) : (
      this.props.children
    );
  }
}

function MissingKeyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-xl w-full rounded-2xl border border-yellow-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-yellow-800 mb-4">Missing Clerk configuration</h1>
        <p className="text-sm text-gray-600 mb-4">
          The frontend needs a valid Clerk publishable key to start. Please set{" "}
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-sm">VITE_CLERK_PUBLISHABLE_KEY</code>{" "}
          in <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">frontend/.env</code>.
        </p>
        <p className="text-xs text-gray-500">If you already added it, restart the dev server.</p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        {PUBLISHABLE_KEY ? (
          <ClerkRouter>
            <App />
          </ClerkRouter>
        ) : (
          <MissingKeyFallback />
        )}
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
