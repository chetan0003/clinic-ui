import React from "react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login({ onSignup }) {
  const { login } = useAuth();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
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
      await login(form.username.trim(), form.password);
    } catch (err) {
      setError(err.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <div className="brand-logo">+</div>
          <div>
            <div className="brand-name">Hola MD</div>
            <div className="auth-brand-sub">Clinic Management Platform</div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-title">
            <h1>Welcome back</h1>
            <p>Sign in to manage your clinic.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

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
        </div>

        {/* <div className="auth-note">
          API: <code>POST /api/auth/login</code>
        </div> */}
      </div>
    </div>
  );
}
