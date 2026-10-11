import React from "react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import holaMdLogo from "../assets/logo/hola-md-final-logo.png";

export default function Login({ onSignup }) {
  const { login, pendingAuthChallenge, completeAuthenticatorLogin, cancelAuthenticatorLogin } = useAuth();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [authenticatorCode, setAuthenticatorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(e) {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!form.username.trim() || !form.password) {
      setError("Username and password are required.");
      return;
    }

    try {
      setLoading(true);
      const result = await login(form.username.trim(), form.password);
      if (!result?.totpRequired) setAuthenticatorCode("");
    } catch (err) {
      setError(err.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAuthenticator(e) {
    e.preventDefault();
    setError("");
    const code = authenticatorCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setLoading(true);
      await completeAuthenticatorLogin(code);
    } catch (err) {
      setError(err.message || "Unable to verify the authenticator code.");
    } finally {
      setLoading(false);
    }
  }

  function returnToPasswordLogin() {
    cancelAuthenticatorLogin();
    setAuthenticatorCode("");
    setError("");
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <img className="brand-logo-image" src={holaMdLogo} alt="Hola MD logo" />
          <div>
            <div className="brand-name">Hola MD</div>
            <div className="auth-brand-sub">Booking Management Platform</div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-title">
            <h1>{pendingAuthChallenge ? "Authenticator verification" : "Welcome back"}</h1>
            <p>{pendingAuthChallenge ? "Enter the 6-digit code from your authenticator app." : "Sign in to manage your clinic."}</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {pendingAuthChallenge ? <form onSubmit={verifyAuthenticator} className="auth-form">
            <div className="field">
              <label htmlFor="authenticator-code">Authenticator code</label>
              <input
                id="authenticator-code"
                name="authenticatorCode"
                value={authenticatorCode}
                onChange={(event) => setAuthenticatorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoFocus
              />
            </div>
            <button className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify and Sign In"}
            </button>
            <button type="button" className="btn btn-outline auth-submit" disabled={loading} onClick={returnToPasswordLogin}>Back to Sign In</button>
          </form> : <>
            <form onSubmit={submit} className="auth-form">
              <div className="field">
                <label>Username</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={update}
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>

              <div className="field">
                <label>Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={update}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>

              <button className="btn btn-primary auth-submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="auth-footer">
              <span>Need a clinic user account?</span>
              <button className="link-button" onClick={onSignup}>
                Sign up
              </button>
            </div>
          </>}
        </div>

        {/* <div className="auth-note">
          API: <code>POST /api/auth/login</code>
        </div> */}
      </div>
    </div>
  );
}
