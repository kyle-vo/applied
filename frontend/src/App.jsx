import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp } from "@clerk/clerk-react";
import Navbar from "./Navbar";
import Dashboard from "./Dashboard";
import Applications from "./Applications";
import Analysis from "./Analysis";
import Settings from "./Settings";

function ProtectedLayout({ children }) {
  return (
    <>
      <SignedIn>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
            {children}
          </main>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={<ProtectedLayout><Dashboard /></ProtectedLayout>}
      />
      <Route
        path="/applications"
        element={<ProtectedLayout><Applications /></ProtectedLayout>}
      />
      <Route
        path="/analysis"
        element={<ProtectedLayout><Analysis /></ProtectedLayout>}
      />
      <Route
        path="/settings"
        element={<ProtectedLayout><Settings /></ProtectedLayout>}
      />
      <Route
        path="/debug"
        element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h1 className="text-2xl font-semibold mb-4">Debug route</h1>
              <p className="mb-4 text-sm text-slate-600">The frontend is running and rendering a local route.</p>
              <a href="/dashboard" className="text-brand-600 underline">Go to Dashboard</a>
            </div>
          </div>
        }
      />
      <Route path="/sign-in/*" element={<SignIn />} />
      <Route path="/sign-up/*" element={<SignUp />} />
    </Routes>
  );
}
