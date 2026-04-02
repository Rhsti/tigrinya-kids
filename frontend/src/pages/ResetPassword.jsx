import { useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/auth";
import "../styles/auth.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Reset link is missing token. Please request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const data = await resetPassword(token, password);
      setSuccess(data?.message || "Password has been reset successfully");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message || "Could not reset password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form auth-form-compact" onSubmit={handleSubmit}>
        <div className="auth-header">
          <span className="auth-kicker">Secure Reset</span>
          <h2>Create a new password</h2>
          <p>Choose a strong password for your account.</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <label className="auth-label" htmlFor="reset-password">New Password</label>
        <input
          id="reset-password"
          type="password"
          placeholder="Enter new password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          minLength={6}
        />

        <p className="auth-help-text">Use at least 6 characters.</p>

        <label className="auth-label" htmlFor="reset-confirm-password">Confirm Password</label>
        <input
          id="reset-confirm-password"
          type="password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          required
          minLength={6}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Resetting password..." : "Reset Password"}
        </button>

        <p className="auth-switch">
          <Link to="/forgot-password">Request another reset link</Link>
        </p>
      </form>
    </div>
  );
}
