import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyCourses, getMyReceipts, downloadMyReceiptCsv } from "../api/auth";
import { COURSE_MAP } from "../data/courses";
import "../styles/mycourses.css";

export default function MyCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [error, setError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [welcomeNotice, setWelcomeNotice] = useState("");

  useEffect(() => {
    const notice = localStorage.getItem("tgk_welcome_notice");
    if (!notice) return;
    setWelcomeNotice(notice);
    localStorage.removeItem("tgk_welcome_notice");
  }, []);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("jwt");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const courseData = await getMyCourses();
        setCourses(courseData?.purchasedCourses || []);
      } catch (err) {
        setError(err.message || "Failed to load your courses.");
      }

      try {
        const receiptData = await getMyReceipts();
        setReceipts(receiptData?.purchases || []);
      } catch (err) {
        setReceiptError(err.message || "Could not load receipt history.");
      } finally {
        setIsSyncing(false);
      }
    };

    load();
  }, [navigate]);

  return (
    <div className="my-courses-page pricing-container">
      <div className="pricing-header">
        <h1>My Courses</h1>
        <p>Access your purchased courses and receipt history.</p>
      </div>

      {error && (
        <div className="my-courses-alert my-courses-alert-error">
          {error}
        </div>
      )}

      {welcomeNotice && (
        <div className="my-courses-alert my-courses-alert-success">
          {welcomeNotice}
        </div>
      )}

      {courses.length === 0 && !isSyncing ? (
        <div className="my-courses-empty">
          <h3>No purchased courses yet</h3>
          <p>Buy a course to start learning.</p>
          <button className="start-learning-btn" onClick={() => navigate("/pricing")}>Go to Pricing</button>
        </div>
      ) : isSyncing && courses.length === 0 ? (
        <div className="my-courses-skeleton">
          <div className="my-courses-skeleton-card" />
          <div className="my-courses-skeleton-card" />
          <div className="my-courses-skeleton-card" />
        </div>
      ) : (
        <div className="my-courses-grid">
          {courses.filter((courseId) => !!COURSE_MAP[courseId]).map((courseId) => (
            <div key={courseId} className="my-course-card">
              {COURSE_MAP[courseId]?.image && (
                <img
                  src={COURSE_MAP[courseId].image}
                  alt={`${COURSE_MAP[courseId].title} artwork`}
                  className="my-course-image"
                  loading="lazy"
                />
              )}
              <h3>{COURSE_MAP[courseId]?.title || courseId}</h3>
              <p>{COURSE_MAP[courseId]?.description || "Course purchased"}</p>
              <button
                className="start-learning-btn"
                onClick={() => navigate(courseId === "basic" ? "/alphabet-tigrinya" : `/lessons/${courseId}`)}
              >
                Start Course
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="my-courses-section">
        <div className="my-courses-section-head">
          <h2>Receipt History</h2>
          <button className="start-learning-btn" onClick={downloadMyReceiptCsv}>Download Receipt CSV</button>
        </div>
        <div className="my-courses-receipts">
          {receiptError ? (
            <p className="my-courses-empty-receipts">{receiptError}</p>
          ) : receipts.length === 0 ? (
            <p className="my-courses-empty-receipts">No receipts available yet.</p>
          ) : (
            receipts.map((item) => (
              <div key={item._id} className="my-courses-receipt-card">
                <strong>{COURSE_MAP[item.courseId]?.title || item.courseId}</strong>
                <p>Amount: ${item.amount} {String(item.currency || "usd").toUpperCase()}</p>
                <p>Status: {item.status}</p>
                <p>Date: {new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
