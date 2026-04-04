import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyPurchase } from "../api/auth";
import Button from "../components/ui/Button";

const courseTitles = {
  basic: "Basic Tigrinya",
  intermediate: "Intermediate Tigrinya",
  advanced: "Advanced Tigrinya",
};

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [receiptText, setReceiptText] = useState("");
  const [accessUrl, setAccessUrl] = useState("");
  const [message, setMessage] = useState("Please wait while we confirm your purchase.");

  useEffect(() => {
    const verifyPayment = async () => {
      const token = localStorage.getItem("jwt");
      const sessionId = searchParams.get("session_id");
      const courseId = searchParams.get("course") || localStorage.getItem("pendingCourse");
      const method = searchParams.get("method") || localStorage.getItem("pendingPaymentMethod") || "card";
      const provider = searchParams.get("provider") || "stripe";

      setPaymentMethod(method);

      if (!token || !courseId || !sessionId) {
        setStatus("error");
        return;
      }

      try {
        let data = null;
        const maxAttempts = 12;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          data = await verifyPurchase(sessionId, courseId, provider, method);
          if (!data?.pendingWebhook) {
            break;
          }
          setMessage("Payment received. Waiting for secure confirmation...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (!data || data.pendingWebhook) {
          throw new Error("Payment is still processing. Please refresh this page in a moment.");
        }

        // Get the updated purchased courses
        const coursesData = data.purchasedCourses || [courseId];
        setPurchasedCourses(coursesData);
        setPaymentMethod(data.paymentMethod || method);
        setEmailSent(Boolean(data.emailSent));
        if (data.receipt) {
          setReceiptText(`${data.receipt.provider.toUpperCase()} ${data.receipt.currency.toUpperCase()} ${data.receipt.amount}`);
        }
        setAccessUrl(data.accessUrl || "/my-courses");
        setStatus("success");

        localStorage.removeItem("pendingSessionId");
        localStorage.removeItem("pendingCourse");
        localStorage.removeItem("pendingPaymentMethod");
      } catch (error) {
        console.error("Verification error:", error);
        setMessage(error.message || "There was an issue verifying your payment.");
        setStatus("error");
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleGoToHome = () => navigate("/my-courses");
  const handleGoToPricing = () => navigate("/pricing");
  const paymentLabel = paymentMethod === "paypal" ? "PayPal" : "Credit Card";
  const receiptDeliveryLabel = receiptText.startsWith("DEMO")
    ? "Demo receipt created. No live charge was processed."
    : emailSent
      ? "Receipt email sent to your inbox."
      : "Receipt email pending. Please check your email setup.";

  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => {
      navigate("/my-courses");
    }, 1800);
    return () => clearTimeout(timer);
  }, [status, navigate]);

  if (status === "verifying") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "20px" }}>
        <h2>Verifying your payment...</h2>
        <p>{message}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "20px" }}>
        <h2>Payment Verification Failed</h2>
        <p>{message || "There was an issue verifying your payment. Please contact support."}</p>
        <div style={{ marginTop: "20px" }}>
          <Button onClick={handleGoToPricing}>Go to Pricing</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "20px" }}>
      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <h1 style={{ color: "#4CAF50", marginBottom: "20px" }}>✓ Payment Successful!</h1>
        <p>Thank you for your purchase! You now have access to your course.</p>
        <p style={{ marginTop: "8px", color: "#555" }}>Payment method: {paymentLabel}</p>
        <p style={{ marginTop: "6px", color: "#555" }}>{receiptDeliveryLabel}</p>
        {receiptText && <p style={{ marginTop: "6px", color: "#555" }}>Receipt: {receiptText}</p>}
        {accessUrl && <p style={{ marginTop: "6px", color: "#555" }}>Access ready in My Courses.</p>}

        <div style={{ margin: "30px 0", padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
          <h3>Your Purchased Courses:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {purchasedCourses.map(course => (
              <li key={course} style={{ padding: "5px 0" }}>
                ✓ {courseTitles[course] || course}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <Button onClick={handleGoToHome}>Go To My Course</Button>
          <Button onClick={handleGoToPricing}>Buy More Courses</Button>
        </div>
      </div>
    </div>
  );
}

