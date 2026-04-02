// src/auth.js

// ----------------------
// Base URL - use relative path for Vite proxy
// ----------------------
// In development, Vite proxy handles the routing
// In production, you can set VITE_API_URL
const BASE_URL = import.meta.env.VITE_API_URL || "";

// ----------------------
// Helpers
// ----------------------

// Get JWT token from localStorage and return Authorization header
const getAuthHeader = () => {
  const token = localStorage.getItem("jwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Generic fetch wrapper
async function apiFetch(endpoint, options = {}) {
  try {
    const { headers: customHeaders = {}, ...restOptions } = options;
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      credentials: "include", // include cookies if any
      headers: {
        ...getAuthHeader(),
        ...customHeaders,
      },
      ...restOptions,
    });

    if (!res.ok) {
      const text = await res.text();
      let message = text || res.statusText;

      try {
        const parsed = JSON.parse(text);
        if (parsed?.message) {
          message = parsed.message;
        }
      } catch {
        // Keep original response text when body is not JSON.
      }

      if (
        res.status === 401 &&
        /token expired|invalid token|no token provided/i.test(String(message))
      ) {
        localStorage.removeItem("jwt");
        throw new Error("Session expired. Please login again.");
      }

      throw new Error(`API Error ${res.status}: ${message}`);
    }

    // Attempt to parse JSON
    try {
      return await res.json();
    } catch {
      return null; // no JSON response
    }
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        "Cannot connect to backend API. Start backend server on http://localhost:5000 and try again."
      );
    }

    throw err;
  }
}

// ----------------------
// Authentication
// ----------------------
export function register(userData) {
  return apiFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
}

export function login(credentials) {
  return apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
}

export function forgotPassword(email) {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token, password) {
  return apiFetch("/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
}

// ----------------------
// Courses
// ----------------------
export function getMyCourses() {
  return apiFetch("/payment/my-courses");
}

export async function getPurchasedCourses() {
  const token = localStorage.getItem("jwt");
  if (!token) return [];

  const data = await apiFetch("/payment/my-courses", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  return data?.purchasedCourses || [];
}

export async function createStripeSession(courseId, paymentMethod = "card") {
  const token = localStorage.getItem("jwt");

  if (!token) {
    throw new Error("User not logged in");
  }

  return apiFetch("/payment/create-stripe-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ courseId, paymentMethod }),
  });
}

// Verify if user purchased a course
export function verifyPurchase(sessionId, courseId, provider = "stripe", method = "card") {
  const token = localStorage.getItem("jwt");

  if (!token) {
    throw new Error("User not logged in");
  }

  const qs = new URLSearchParams({
    session_id: sessionId || "",
    provider,
    method,
  });

  return apiFetch(`/payment/verify/${courseId}?${qs.toString()}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
}

// ----------------------
// Letters
// ----------------------
export function fetchLetters() {
  return apiFetch("/letters");
}

export function saveLearnedLetter(letterId) {
  return apiFetch("/letters/learned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ letterId }),
  });
}

export function fetchLetterAnalytics() {
  return apiFetch("/letters/analytics");
}

export function saveLetterAnalytics(analytics) {
  return apiFetch("/letters/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(analytics),
  });
}

export function getMyReceipts() {
  return apiFetch("/payment/my-receipts");
}

export async function downloadMyReceiptCsv() {
  const token = localStorage.getItem("jwt");
  if (!token) {
    throw new Error("User not logged in");
  }

  const url = `${BASE_URL}/payment/my-receipts/export.csv`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to download receipt CSV");
  }

  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = "my-receipts.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(downloadUrl);
}

export function checkCourseAccess(courseId) {
  return apiFetch(`/payment/access/${courseId}`);
}

export function getPaymentPublicConfig() {
  return apiFetch('/payment/public-config');
}

export function getAdminPurchases(page = 1, limit = 20) {
  return apiFetch(`/payment/admin/purchases?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`);
}

export async function downloadAdminPurchaseCsv() {
  const token = localStorage.getItem("jwt");
  if (!token) {
    throw new Error("User not logged in");
  }

  const url = `${BASE_URL}/payment/admin/purchases/export.csv`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to download admin purchase CSV");
  }

  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = "purchase-history.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(downloadUrl);
}

export function checkAdminAccess() {
  return apiFetch('/payment/admin/access');
}

export function fetchCourseProgress(courseId) {
  return apiFetch(`/auth/course-progress/${encodeURIComponent(courseId)}`);
}

export function saveCourseProgress(courseId, progress) {
  return apiFetch(`/auth/course-progress/${encodeURIComponent(courseId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(progress),
  });
}