import { useState, useEffect } from "react";
import { login, createStripeSession } from "../api/auth"; // ensure this points to your auth.js
import { useNavigate, Link } from "react-router-dom";
import "../styles/auth.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home if already logged in
    if (localStorage.getItem("jwt")) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const data = await login({ email: normalizedEmail, password });
      const autoCreated = /account created/i.test(data?.message || "");

      if (data.token) {
        // Save JWT token
        localStorage.setItem("jwt", data.token);

        // Check for pending course purchase
        const pendingCourse = localStorage.getItem("pendingCourse");
        const pendingMethod = localStorage.getItem("pendingPaymentMethod") || "card";
        if (pendingCourse) {
          try {
            const paymentData = await createStripeSession(pendingCourse, pendingMethod);
            if (paymentData.url) {
              localStorage.setItem("pendingSessionId", paymentData.sessionId);
              window.location.href = paymentData.url;
              return; // stop further navigation
            }
          } catch (paymentError) {
            console.error("Payment error:", paymentError);
          }
        }

        // Redirect after login if specified
        const redirectAfterLogin = localStorage.getItem("redirectAfterLogin");
        if (redirectAfterLogin) {
          localStorage.removeItem("redirectAfterLogin");
          navigate(redirectAfterLogin);
        } else if (autoCreated) {
          setInfo("No account was found, so we created one for you and logged you in.");
          setTimeout(() => navigate("/"), 1200);
        } else {
          navigate("/"); // default home page
        }
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form auth-form-compact" onSubmit={handleLogin}>
        <div className="auth-header">
          <span className="auth-kicker">Welcome Back</span>
          <h2>Sign in to continue learning</h2>
          <p>Access your courses, lessons, and progress in one place.</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {info && <div className="success-message">{info}</div>}

        <label className="auth-label" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          disabled={loading}
          required
        />

        <label className="auth-label" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          disabled={loading}
          required
        />

        <p className="auth-inline-link-row">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register</Link>
        </p>

        <p className="pricing-link">
          <Link to="/pricing">View Pricing Plans</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;