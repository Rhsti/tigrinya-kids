import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { checkAdminAccess } from "../api/auth";
import { COURSE_MAP } from "../data/courses";
import "../styles/navbar.css";

function Navbar({ theme, onThemeChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("jwt");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isLessonPage = location.pathname.startsWith("/lessons/");
  const activeCourseId = isLessonPage ? location.pathname.split("/")[2] : "";
  const activeCourseTitle = activeCourseId ? COURSE_MAP[activeCourseId]?.title : "";
  const learningLink = isLessonPage ? location.pathname : "/";
  const learningLabel = isLessonPage
    ? activeCourseTitle
      ? `Current Lesson: ${activeCourseTitle}`
      : "Current Lesson"
    : "Course";
  const homeLink = token ? "/dashboard" : "/pricing";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setIsAdmin(false);
      return () => {
        cancelled = true;
      };
    }

   const loadAdminStatus = async () => {
  try {
    const data = await checkAdminAccess();
    setIsAdmin(data?.admin || false);
  } catch (err) {
    console.log("Not admin or not logged in");
    setIsAdmin(false); // ✅ IMPORTANT
  }
};
    loadAdminStatus();

    return () => {
      cancelled = true;
    };
  }, [token, location.pathname]);

  const logout = () => {
    localStorage.removeItem("jwt");
    setIsMenuOpen(false);
    navigate("/pricing");
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to={homeLink}>
          <span className="logo-title">Tigrinya Kids</span>
          <span className="logo-subtitle">Language Learning Platform</span>
        </Link>
      </div>

      <button
        className="menu-toggle"
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        <span className="menu-bar"></span>
        <span className="menu-bar"></span>
        <span className="menu-bar"></span>
      </button>

      <div className={`nav-links ${isMenuOpen ? "open" : ""}`}>
        <div className="theme-switch" aria-label="Theme switcher">
          <button
            type="button"
            className={`theme-btn ${theme === "sunny" ? "active" : ""}`}
            onClick={() => onThemeChange("sunny")}
          >
            Sunny
          </button>
          <button
            type="button"
            className={`theme-btn ${theme === "ocean" ? "active" : ""}`}
            onClick={() => onThemeChange("ocean")}
          >
            Ocean
          </button>
          <button
            type="button"
            className={`theme-btn ${theme === "night" ? "active" : ""}`}
            onClick={() => onThemeChange("night")}
          >
            Night
          </button>
        </div>

        <NavLink to="/pricing" className={({ isActive }) => isActive ? "active-link" : ""} onClick={() => setIsMenuOpen(false)}>Pricing</NavLink>

        {token ? (
          <>
            <NavLink to="/my-courses" className={({ isActive }) => isActive ? "active-link" : ""} onClick={() => setIsMenuOpen(false)}>My Courses</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active-link" : ""} onClick={() => setIsMenuOpen(false)}>Dashboard</NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? "active-link" : ""} onClick={() => setIsMenuOpen(false)}>Profile</NavLink>
            {isAdmin ? (
              <NavLink to="/admin/purchases" className={({ isActive }) => isActive ? "active-link" : ""} onClick={() => setIsMenuOpen(false)}>Admin</NavLink>
            ) : null}
            <NavLink to={learningLink} className={({ isActive }) => isActive || (isLessonPage && location.pathname === learningLink) ? "active-link" : ""} onClick={() => setIsMenuOpen(false)}>{learningLabel}</NavLink>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => isActive ? "active-link" : ""} onClick={() => setIsMenuOpen(false)}>Login</NavLink>
            <Link to="/register" className="register-btn" onClick={() => setIsMenuOpen(false)}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
