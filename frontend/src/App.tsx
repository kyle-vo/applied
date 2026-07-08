import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp } from "@clerk/clerk-react";
import { ReactNode, useState } from "react";
import Navbar from "./Navbar";
import Dashboard from "./Dashboard";
import Applications from "./Applications";
import Analysis from "./Analysis";
import Analytics from "./Analytics";
import Settings from "./Settings";
import { ToastProvider } from "./Toast";
import { isDemoMode, startDemo } from "./demo";

function DemoBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm text-center px-4 py-1.5">
      You&apos;re exploring the demo — the data is sample data and this session resets after 24
      hours.
    </div>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {isDemoMode() && <DemoBanner />}
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  if (isDemoMode()) {
    return <AppLayout>{children}</AppLayout>;
  }
  return (
    <>
      <SignedIn>
        <AppLayout>{children}</AppLayout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function TryDemoButton() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    try {
      setStarting(true);
      setError(null);
      await startDemo();
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  }

  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-gray-500 mb-2">Just looking around?</p>
      <button
        onClick={handleClick}
        disabled={starting}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {starting ? "Setting up the demo…" : "Try the demo — no sign-up"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <SignIn />
      <TryDemoButton />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/applications" element={<ProtectedLayout><Applications /></ProtectedLayout>} />
        <Route path="/analysis" element={<ProtectedLayout><Analysis /></ProtectedLayout>} />
        <Route path="/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />
        <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
        <Route
          path="/debug"
          element={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <h1 className="text-2xl font-semibold mb-4">Debug route</h1>
                <p className="mb-4 text-sm text-slate-600">
                  The frontend is running and rendering a local route.
                </p>
                <a href="/dashboard" className="text-brand-600 underline">Go to Dashboard</a>
              </div>
            </div>
          }
        />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUp />} />
      </Routes>
    </ToastProvider>
  );
}
