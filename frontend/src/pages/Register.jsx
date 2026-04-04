import { useState, useEffect } from "react";
import { register, login, createStripeSession } from "../api/auth"; // make sure this points to your auth.js
import { useNavigate, Link } from "react-router-dom";
import "../styles/auth.css";

export default function Register() {
  const WELCOME_NOTICE_KEY = "tgk_welcome_notice";
  const WELCOME_NOTICE_TEXT = "Welcome new user! Your account is ready.";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  const pendingCourse = localStorage.getItem("pendingCourse");
  const getCourseRoute = (courseId) => (courseId === "basic" ? "/alphabet-tigrinya" : `/lessons/${courseId}`);

  const redirectToCheckout = (url) => {
    if (!url) return;

    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin && parsed.pathname === "/checkout/success") {
        navigate(`${parsed.pathname}${parsed.search}`);
        return;
      }

      window.location.href = parsed.toString();
    } catch {
      setError("Invalid checkout URL returned by server");
    }
  };

  useEffect(() => {
    if (localStorage.getItem("jwt")) {
      navigate("/");
    }
  }, [navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || !confirmPassword) {
      return setError("Please complete all fields.");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);

      // 1️⃣ Register user
      const registerData = await register({ email: normalizedEmail, password });
      if (registerData?.emailServiceConfigured === false) {
        setInfo("Account created. Email service is not configured yet.");
      } else if (registerData?.welcomeEmailSent === false) {
        setInfo("Account created. Welcome email could not be sent this time.");
      }

      // 2️⃣ Authenticate immediately from register response (no extra login step)
      let token = registerData?.token;

      // Backward-compatible fallback if register token is missing
      if (!token) {
        const loginData = await login({ email: normalizedEmail, password });
        token = loginData?.token || "";
      }

      if (token) {
        localStorage.setItem("jwt", token);
        localStorage.setItem(WELCOME_NOTICE_KEY, WELCOME_NOTICE_TEXT);

        // 3️⃣ Handle pending course purchase
        if (pendingCourse) {
          try {
            const pendingMethod = localStorage.getItem("pendingPaymentMethod") || "card";
            const paymentData = await createStripeSession(pendingCourse, pendingMethod);
            if (paymentData.url) {
              localStorage.setItem("pendingSessionId", paymentData.sessionId);
              redirectToCheckout(paymentData.url);
              return; // stop further navigation
            }

            // If checkout URL is not returned, still send user directly to selected course.
            navigate(getCourseRoute(pendingCourse));
            return;
          } catch (paymentError) {
            console.error("Payment error:", paymentError);
            // Continue to selected course if payment init fails
            navigate(getCourseRoute(pendingCourse));
            return;
          }
        }

        // 4️⃣ Clear pending course
        localStorage.removeItem("pendingCourse");
        localStorage.removeItem("pendingPaymentMethod");

        navigate("/my-courses");
      } else {
        // Fallback only when auth token could not be obtained
        navigate("/login");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form auth-form-compact" onSubmit={handleRegister}>
        <div className="auth-header">
          <span className="auth-kicker">Get Started</span>
          <h2>Create your learning account</h2>
          <p>Set up your account to unlock lessons and track progress.</p>
        </div>

        {pendingCourse && (
          <div className="payment-notice">
            ✓ Complete your registration to purchase the course!
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {info && <div className="success-message">{info}</div>}

        <label className="auth-label" htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />

        <label className="auth-label" htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          minLength={6}
          required
        />

        <p className="auth-help-text">Use at least 6 characters.</p>

        <label className="auth-label" htmlFor="register-confirm-password">Confirm Password</label>
        <input
          id="register-confirm-password"
          type="password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          minLength={6}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}