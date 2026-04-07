import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPurchasedCourses, createStripeSession, getPaymentPublicConfig } from "../api/auth";
import { COURSE_CATALOG } from "../data/courses";
import "../styles/pricing.css";

export default function Pricing() {
  const didInitFetch = useRef(false);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [buyingCourse, setBuyingCourse] = useState("");
  const [paymentConfig, setPaymentConfig] = useState({ paymentsEnabled: false, stripeMode: "unconfigured", checkoutMode: "offline" });
  const [, setPaymentStatusMessage] = useState("Online checkout is temporarily unavailable.");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("payment") === "cancelled") {
      setError("Payment was cancelled. You can try again when ready.");
    }
    if (searchParams.get("payment") === "failed") {
      setError("Payment failed. Please use another card or try again.");
    }
  }, [searchParams]);

  const redirectToCheckout = useCallback((url) => {
    if (!url) return;

    try {
      const parsed = new URL(url, window.location.origin);

      // In-app success URL is routed with React Router.
      if (parsed.origin === window.location.origin && parsed.pathname === "/checkout/success") {
        navigate(`${parsed.pathname}${parsed.search}`);
        return;
      }

      window.location.href = parsed.toString();
    } catch {
      setError("Invalid checkout URL returned by server");
    }
  }, [navigate]);

  // Fetch purchased courses safely
  useEffect(() => {
    if (didInitFetch.current) return;
    didInitFetch.current = true;

    async function fetchCourses() {
      const token = localStorage.getItem("jwt");
      let backendOnline = false;

      try {
        const config = await getPaymentPublicConfig();
        setPaymentConfig(config || { paymentsEnabled: false, stripeMode: "unconfigured", checkoutMode: "offline" });
        setPaymentStatusMessage(config?.message || "Online checkout is temporarily unavailable.");
        backendOnline = true;
      } catch {
        setPaymentConfig({ paymentsEnabled: false, stripeMode: "unconfigured", checkoutMode: "offline" });
        setPaymentStatusMessage("Backend is offline. Start the API server to enable checkout.");
      }

      if (!token || !backendOnline) {
        setCourses([]);
        return;
      }

      try {
        const purchasedCourses = await getPurchasedCourses();
        setCourses(purchasedCourses);
      } catch {
        setCourses([]);
      }
    }

    fetchCourses();
  }, []);

  // Auto-start pending purchase after login
  useEffect(() => {
    async function autoStartPendingPurchase() {
      const pendingCourse = localStorage.getItem("pendingCourse");
      const pendingMethod = localStorage.getItem("pendingPaymentMethod") || "card";
      const token = localStorage.getItem("jwt");
      if (!pendingCourse) return;

      // Pending checkout requires auth; if user is not logged in yet, keep it queued.
      if (!token) {
        return;
      }

      try {
        const { url, sessionId } = await createStripeSession(pendingCourse, pendingMethod);
        if (url) {
          localStorage.removeItem("pendingCourse");
          localStorage.removeItem("pendingPaymentMethod");
          localStorage.setItem("pendingSessionId", sessionId);
          redirectToCheckout(url);
        } else {
          setError("Failed to create checkout session. Please try again.");
        }
      } catch (err) {
        console.error("Auto purchase error:", err.message || err);
        if (/session expired|no token provided|invalid token|user not logged in/i.test(String(err?.message || ""))) {
          navigate("/login");
          return;
        }
        setError(err?.message || "Could not start your pending checkout. Please try again.");
      }
    }

    autoStartPendingPurchase();
  }, [navigate, redirectToCheckout]);

  // Handle manual purchase click
  const handleBuy = async (courseId, paymentMethod) => {
    if (!paymentConfig.paymentsEnabled) {
      setError("Online checkout is temporarily unavailable. Please try again later.");
      return;
    }

    const token = localStorage.getItem("jwt");

    if (!token) {
      localStorage.setItem("pendingCourse", courseId);
      localStorage.setItem("pendingPaymentMethod", paymentMethod);
      localStorage.setItem("redirectAfterLogin", "/pricing");
      navigate("/login");
      return;
    }

    try {
      setBuyingCourse(`${courseId}:${paymentMethod}`);
      setError("");
      const data = await createStripeSession(courseId, paymentMethod);
      
      if (data.url) {
        redirectToCheckout(data.url);
      } else {
        setError("Failed to create checkout session");
      }
    } catch (err) {
      console.error("Payment error:", err);

      if (/session expired/i.test(err.message)) {
        localStorage.setItem("pendingCourse", courseId);
        localStorage.setItem("pendingPaymentMethod", paymentMethod);
        navigate("/login");
        return;
      }

      setError(err.message || "Failed to process payment. Please try again.");
    } finally {
      setBuyingCourse("");
    }
  };

  const isPurchased = (courseId) => courses.includes(courseId);

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Choose Your Learning Plan</h1>
        <p>Start learning Tigrinya today with our interactive courses</p>
        {/* <p className={`payment-status ${paymentConfig.paymentsEnabled ? "online" : "offline"}`}>
          Payment status: {paymentConfig.paymentsEnabled ? paymentStatusMessage : paymentStatusMessage}
        </p> */}
      </div>

      {/* Error Display */}
      {error && (
        <div className="pricing-alert">
          {error}
        </div>
      )}

      {/* Available Courses Grid */}
      <div className="pricing-grid">
        {COURSE_CATALOG.map((course, index) => (
          <div 
            key={course.id} 
            className={`pricing-card ${course.popular ? 'popular' : ''} ${isPurchased(course.id) ? 'purchased' : ''}`}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {course.popular && <span className="popular-badge">Most Popular</span>}
            {isPurchased(course.id) && <span className="purchased-badge">✓ Purchased</span>}

            <img
              src={course.image}
              alt={`${course.title} artwork`}
              className="pricing-card-image"
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              decoding="async"
            />

            <div className="pricing-meta-row">
              <span>{course.level}</span>
              <span>{course.duration}</span>
            </div>

            <h2>{course.title}</h2>
            <div className="price">
              <span className="currency">$</span>
              <span className="amount">{course.price.toFixed(2)}</span>
              <span className="period">/one-time</span>
            </div>
            <p className="course-description">{course.description}</p>

            <ul className="features">
              {course.features.map((feature, index) => (
                <li key={index}>✓ {feature}</li>
              ))}
            </ul>

            {isPurchased(course.id) ? (
              <button className="buy-btn" disabled>Already Purchased</button>
            ) : (
              <div className="payment-options">
                <button
                  className="buy-btn"
                  onClick={() => handleBuy(course.id, "card")}
                  disabled={buyingCourse === `${course.id}:card` || !paymentConfig.paymentsEnabled}
                >
                  {!paymentConfig.paymentsEnabled
                    ? "Payments Unavailable"
                    : buyingCourse === `${course.id}:card`
                      ? "Redirecting to secure checkout..."
                      : paymentConfig.checkoutMode === "demo"
                        ? "Unlock Course"
                        : "Buy Course Securely"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Purchased Courses Section */}
      {courses.length > 0 && (
        <div className="my-courses-section">
          <h2>Your Purchased Courses</h2>
          <div className="my-courses-grid">
            {courses.map((courseId) => {
              const courseInfo = COURSE_CATALOG.find((c) => c.id === courseId);
              return courseInfo ? (
                <div key={courseId} className="my-course-card">
                  <img
                    src={courseInfo.image}
                    alt={`${courseInfo.title} artwork`}
                    className="my-course-image"
                    loading="lazy"
                    decoding="async"
                  />
                  <h3>{courseInfo.title}</h3>
                  <p>{courseInfo.description}</p>
                  <button
                    className="start-learning-btn"
                    onClick={() => navigate(courseId === "basic" ? "/alphabet-tigrinya" : `/lessons/${courseId}`)}
                  >
                    Start Learning →
                  </button>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}