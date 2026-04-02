import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/auth";
import "../styles/auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Please enter your account email.");
      return;
    }

    try {
      setLoading(true);
      const data = await forgotPassword(normalizedEmail);
      if (data?.emailServiceConfigured === false && data?.resetUrl) {
        // SMTP not configured — redirect directly to the reset page
        navigate(new URL(data.resetUrl).pathname + new URL(data.resetUrl).search);
        return;
      }
      setSuccess(data?.message || "If the account exists, a reset email has been sent.");
    } catch (err) {
      setError(err.message || "Unable to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form auth-form-compact" onSubmit={handleSubmit}>
        <div className="auth-header">
          <span className="auth-kicker">Password Help</span>
          <h2>Forgot your password?</h2>
          <p>Enter your email and we will send you a secure reset link.</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <label className="auth-label" htmlFor="forgot-email">Email</label>
        <input
          id="forgot-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Sending reset email..." : "Send Reset Link"}
        </button>

        <p className="auth-switch">
          Remember your password? <Link to="/login">Back to Login</Link>
        </p>
      </form>
    </div>
  );
}
