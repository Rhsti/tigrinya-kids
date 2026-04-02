import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminPurchases, downloadAdminPurchaseCsv } from "../api/auth";

const PAGE_SIZE = 20;

export default function AdminPurchases() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("jwt");
      if (!token) {
        navigate("/login");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await getAdminPurchases(page, PAGE_SIZE);
        setRows(data?.purchases || []);
        setTotal(Number(data?.total || 0));
      } catch (err) {
        if (/403|admin access required/i.test(String(err.message || ""))) {
          setError("Admin access required. Your account is not allowed to view purchase logs.");
        } else {
          setError(err.message || "Failed to load purchase logs.");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, page]);

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Admin Purchase Logs</h1>
        <p>Monitor completed purchases and export receipt history.</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
        <button className="buy-btn" style={{ width: "auto", padding: "10px 16px" }} onClick={downloadAdminPurchaseCsv}>
          Export CSV
        </button>
        <button className="start-learning-btn" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
      </div>

      {loading && <div className="loading">Loading purchase logs...</div>}

      {error && (
        <div style={{ padding: "12px", borderRadius: "12px", background: "#fee", color: "#991b1b", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: "auto", background: "rgba(255,255,255,0.9)", borderRadius: "16px", border: "1px solid rgba(19, 49, 75, 0.1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "rgba(19,49,75,0.06)" }}>
                <th style={{ padding: "12px" }}>Date</th>
                <th style={{ padding: "12px" }}>Email</th>
                <th style={{ padding: "12px" }}>Course</th>
                <th style={{ padding: "12px" }}>Amount</th>
                <th style={{ padding: "12px" }}>Provider</th>
                <th style={{ padding: "12px" }}>Status</th>
                <th style={{ padding: "12px" }}>Payment ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "14px" }}>No purchases found.</td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item._id} style={{ borderTop: "1px solid rgba(19, 49, 75, 0.08)" }}>
                    <td style={{ padding: "12px" }}>{new Date(item.createdAt || item.purchaseDate).toLocaleString()}</td>
                    <td style={{ padding: "12px" }}>{item.email || "-"}</td>
                    <td style={{ padding: "12px" }}>{item.courseId}</td>
                    <td style={{ padding: "12px" }}>${item.amount} {String(item.currency || "usd").toUpperCase()}</td>
                    <td style={{ padding: "12px" }}>{item.provider}</td>
                    <td style={{ padding: "12px" }}>{item.status}</td>
                    <td style={{ padding: "12px" }}>{item.paymentId || item.paymentIntentId || item.checkoutSessionId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "18px" }}>
          <button className="start-learning-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="start-learning-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
        </div>
      )}
    </div>
  );
}
