import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyCourses, getMyReceipts, downloadMyReceiptCsv } from "../api/auth";
import { COURSE_MAP } from "../data/courses";

export default function MyCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [welcomeNotice, setWelcomeNotice] = useState("");

  useEffect(() => {
    const notice = localStorage.getItem("tgk_welcome_notice");
    if (!notice) return;
    setWelcomeNotice(notice);
    localStorage.removeItem("tgk_welcome_notice");
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("jwt");
        if (!token) {
          navigate("/login");
          return;
        }

        const [courseData, receiptData] = await Promise.all([getMyCourses(), getMyReceipts()]);
        setCourses(courseData?.purchasedCourses || []);
        setReceipts(receiptData?.purchases || []);
      } catch (err) {
        setError(err.message || "Failed to load your courses.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  if (loading) {
    return <div className="pricing-container"><div className="loading">Loading your courses...</div></div>;
  }

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>My Courses</h1>
        <p>Access your purchased courses and receipt history.</p>
      </div>

      {error && (
        <div style={{ padding: "12px", marginBottom: "20px", borderRadius: "8px", background: "#fee", color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {welcomeNotice && (
        <div style={{ padding: "12px", marginBottom: "20px", borderRadius: "8px", background: "#e8fff3", color: "#0f5132", border: "1px solid #b7ebc8", fontWeight: 700 }}>
          {welcomeNotice}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="no-courses">
          <h3>No purchased courses yet</h3>
          <p>Buy a course to start learning.</p>
          <button onClick={() => navigate("/pricing")}>Go to Pricing</button>
        </div>
      ) : (
        <div className="my-courses-grid">
          {courses.map((courseId) => (
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
        <h2>Receipt History</h2>
        <button className="start-learning-btn" onClick={downloadMyReceiptCsv}>Download Receipt CSV</button>
        <div style={{ marginTop: "20px" }}>
          {receipts.length === 0 ? (
            <p>No receipts available yet.</p>
          ) : (
            receipts.map((item) => (
              <div key={item._id} style={{ background: "#fff", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
                <strong>{COURSE_MAP[item.courseId]?.title || item.courseId}</strong>
                <p style={{ margin: "4px 0" }}>Amount: ${item.amount} {String(item.currency || "usd").toUpperCase()}</p>
                <p style={{ margin: "4px 0" }}>Status: {item.status}</p>
                <p style={{ margin: "4px 0" }}>Date: {new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
