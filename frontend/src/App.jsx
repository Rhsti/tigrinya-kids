import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PaymentSuccess from "./pages/PaymentSuccess";
import Dashboard from "./pages/Dashboard";
import Lessons from "./pages/Lessons";
import DragGame from "./pages/DragGame";
import MyCourses from "./pages/MyCourses";
import AdminPurchases from "./pages/AdminPurchases";
import AlphabetTigrinya from "./pages/AlphabetTigrinya";
import "./App.css";
import { checkAdminAccess } from "./api/auth";

// Import global styles
import "./styles/navbar.css";
import "./styles/footer.css";
import "./styles/auth.css";
import "./styles/home.css";
import "./styles/pricing.css";
import "./styles/dashboard.css";
import "./styles/lessons.css";
import "./styles/responsive-global.css";


// Protected route wrapper - checks if user has purchased courses
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("jwt");
  if (!token) {
    return <Navigate to="/pricing" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem("jwt");
  const [status, setStatus] = useState("checking"); // checking, allowed, denied

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        if (!cancelled) setStatus("denied");
        return;
      }

      try {
        const result = await checkAdminAccess();
        if (!cancelled) {
          setStatus(result?.isAdmin ? "allowed" : "denied");
        }
      } catch {
        if (!cancelled) setStatus("denied");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (status === "checking") {
    return <div className="loading">Checking admin access...</div>;
  }

  if (status === "denied") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("tgk_theme") || "sunny");

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("tgk_theme", theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Navbar theme={theme} onThemeChange={setTheme} />

      <Routes>
        {/* Dashboard - Main learning hub */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* Lessons - Course content */}
        <Route path="/lessons/:courseId" element={
          <ProtectedRoute>
            <Lessons />
          </ProtectedRoute>
        } />

        {/* My Courses */}
        <Route path="/my-courses" element={
          <ProtectedRoute>
            <MyCourses />
          </ProtectedRoute>
        } />

        {/* Interactive game */}
        <Route path="/drag-game" element={
          <ProtectedRoute>
            <DragGame />
          </ProtectedRoute>
        } />

        {/* Admin purchases */}
        <Route path="/admin/purchases" element={
          <AdminRoute>
            <AdminPurchases />
          </AdminRoute>
        } />
        
        {/* Home - Learning page */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />

        {/* Alphabet Tigrinya dedicated course page */}
        <Route path="/alphabet-tigrinya" element={
          <ProtectedRoute>
            <AlphabetTigrinya />
          </ProtectedRoute>
        } />
        
        {/* Pricing page - accessible to everyone */}
        <Route path="/pricing" element={<Pricing />} />
        
        {/* Checkout success page */}
        <Route path="/checkout/success" element={<PaymentSuccess />} />
        
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Catch all - redirect to pricing */}
        <Route path="*" element={<Navigate to="/pricing" replace />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
