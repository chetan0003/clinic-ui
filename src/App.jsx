import React from "react";
import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { isAuthenticated, profileLoading, profileError, refreshUser, logout } = useAuth();
  const [authPage, setAuthPage] = useState("login");

  if (!isAuthenticated) {
    return authPage === "login" ? (
      <Login onSignup={() => setAuthPage("signup")} />
    ) : (
      <Signup
        onLogin={() => setAuthPage("login")}
        onSignupSuccess={() => setAuthPage("login")}
      />
    );
  }

  if (profileLoading) {
    return <div className="page-loader" role="status" aria-label="Checking account access"><div className="loader-spinner" /><span>Checking subscription status...</span></div>;
  }

  if (profileError) {
    return <div className="auth-page"><div className="auth-shell"><div className="auth-card">
      <div className="auth-title"><h1>Unable to verify account access</h1><p>{profileError}</p></div>
      <div className="quick-actions"><button className="btn btn-primary" onClick={() => refreshUser().catch(() => {})}>Retry</button><button className="btn btn-outline" onClick={logout}>Sign out</button></div>
    </div></div></div>;
  }

  return <Dashboard />;
}
