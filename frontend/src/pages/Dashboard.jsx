import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getMyCourses, fetchLetters } from "../api/auth";
import "../styles/dashboard.css";

// Course content data
const courseContent = {
  basic: {
    title: "Basic Tigrinya",
    description: "Alphabet Tigrinya course",
    lessons: ["Alphabet Recognition", "Letter Sounds", "Alphabet Practice"],
    color: "linear-gradient(135deg, #6dd5fa, #2980b9)",
    icon: "📖"
  },
  intermediate: {
    title: "Intermediate Tigrinya",
    description: "Words Tigrinya course",
    lessons: ["Core Word Bank", "Everyday Tigrinya Words", "Word Practice"],
    color: "linear-gradient(135deg, #f093fb, #f5576c)",
    icon: "🎮"
  },
  advanced: {
    title: "Advanced Tigrinya",
    description: "English sentence practice",
    lessons: ["English Sentence Meaning", "Sentence Structure", "Advanced Sentence Practice"],
    color: "linear-gradient(135deg, #4facfe, #00f2fe)",
    icon: "👑"
  }
};

export default function Dashboard() {
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [progress, setProgress] = useState({});
  const [gameStats, setGameStats] = useState({ streak: 0, points: 0, lastPlayed: "" });
  const [topScore, setTopScore] = useState(null);
  const [isSyncingDashboard, setIsSyncingDashboard] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const canPlayGame = purchasedCourses.some((courseId) => ["intermediate", "advanced"].includes(courseId));

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      setIsSyncingDashboard(true);

      try {
        // Get user info from token
        const tokenParts = JSON.parse(atob(token.split('.')[1]));
        setUser({ name: tokenParts.email?.split('@')[0] || 'Student' });

        setGameStats({
          streak: Number(localStorage.getItem("tgk_game_streak") || 0),
          points: Number(localStorage.getItem("tgk_game_points") || 0),
          lastPlayed: localStorage.getItem("tgk_game_last_played") || "",
        });
        try {
          const board = JSON.parse(localStorage.getItem("tgk_game_leaderboard") || "[]");
          setTopScore(Array.isArray(board) && board.length ? board[0] : null);
        } catch {
          setTopScore(null);
        }

        const [coursesData, lettersData] = await Promise.all([getMyCourses(), fetchLetters()]);
        const purchased = (coursesData.purchasedCourses || []).filter((id) => !!courseContent[id]);
        setPurchasedCourses(purchased);

        // Load letters for progress tracking
        if (lettersData && lettersData.learned) {
          setProgress({
            lettersLearned: lettersData.learned.length,
            totalLetters: lettersData.total || 32,
            percentage: Math.round((lettersData.learned.length / (lettersData.total || 32)) * 100)
          });
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setIsSyncingDashboard(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    navigate("/login");
  };

  const handleActionKeyDown = (event, destination) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(destination);
    }
  };

  return (
    <div className="dashboard">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.name || 'Student'}!</h1>
          <p>Continue your Tigrinya journey with guided lessons, progress tracking, and practice activities.</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Recommended Next Steps */}
      {purchasedCourses.length > 0 && (
        <div className="next-steps">

          <h2>Tigrinya Alphabet Learn</h2>
          <div className="next-lesson-card">
            <div className="lesson-icon">📝</div>
            <div className="lesson-info">
              <h3>Alphabet Tigrinya</h3>
              <p>Open your dedicated alphabet course page</p>
            </div>
            <button onClick={() => navigate("/alphabet-tigrinya")}>Continue</button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h3>{purchasedCourses.length}</h3>
            <p>Courses Owned</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{progress.lettersLearned || 0}</h3>
            <p>Letters Learned</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <h3>{progress.percentage || 0}%</h3>
            <p>Progress</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-info">
            <h3>0</h3>
            <p>Certificates</p>
          </div>
        </div>
      </div>

      <div className="streak-panel">
        <div className="streak-copy">
          <span className="streak-kicker">Daily Challenge Rewards</span>
          <h2>{gameStats.streak} day streak</h2>
          <p>
            Reward points: <strong>{gameStats.points}</strong>
            {gameStats.lastPlayed ? ` • Last played: ${gameStats.lastPlayed}` : " • Start your first challenge today"}
          </p>
        </div>
        <button className="streak-action" onClick={() => navigate("/drag-game")}>Open Challenge</button>
      </div>

      {topScore && (
        <div className="streak-panel leaderboard-panel">
          <div className="streak-copy">
            <span className="streak-kicker">Best Local Record</span>
            <h2>{topScore.score} pts</h2>
            <p>
              Mode: {topScore.mode} • Accuracy: {topScore.accuracy}%
            </p>
          </div>
          <button className="streak-action" onClick={() => navigate("/drag-game")}>Beat Record</button>
        </div>
      )}

      {/* Progress Bar */}
      {progress.totalLetters > 0 && (
        <div className="progress-section">
          <h2>Your Learning Progress</h2>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress.percentage || 0}%` }}>
              <span className="progress-text">{progress.percentage || 0}%</span>
            </div>
          </div>
          <p className="progress-detail">
            {progress.lettersLearned || 0} of {progress.totalLetters} Tigrinya letters mastered
          </p>
        </div>
      )}

      {/* My Courses */}
      <div className="courses-section">
        <div className="section-header">
          <h2>My Courses</h2>
          <Link to="/pricing" className="browse-more">Browse More</Link>
        </div>

        {isSyncingDashboard && (
          <p className="progress-detail">Syncing your dashboard...</p>
        )}

        {purchasedCourses.length > 0 ? (
          <div className="courses-grid">
            {purchasedCourses.map(courseId => {
              const content = courseContent[courseId];
              return content ? (
                <div 
                  key={courseId} 
                  className="course-card"
                  style={{ background: content.color }}
                >
                  <div className="course-icon">{content.icon}</div>
                  <h3>{content.title}</h3>
                  <p>{content.description}</p>
                  <ul className="course-lessons">
                    {content.lessons.map((lesson, index) => (
                      <li key={index}>✓ {lesson}</li>
                    ))}
                  </ul>
                  <button 
                    className="start-btn"
                    onClick={() => navigate(`/lessons/${courseId}`)}
                  >
                    Start Learning
                  </button>
                </div>
              ) : null;
            })}
          </div>
        ) : isSyncingDashboard ? (
          <div className="no-courses">
            <div className="no-courses-icon">⏳</div>
            <h3>Syncing courses...</h3>
            <p>Checking your account and loading your learning data.</p>
          </div>
        ) : (
          <div className="no-courses">
            <div className="no-courses-icon">📖</div>
            <h3>No courses yet!</h3>
            <p>Purchase a course to start learning Tigrinya</p>
            <button onClick={() => navigate("/pricing")}>
              View Courses
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="actions-section">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <div
            className="action-card"
            role="button"
            tabIndex={0}
            aria-label={canPlayGame ? "Open game practice" : "Unlock game practice"}
            onClick={() => navigate(canPlayGame ? "/drag-game" : "/pricing")}
            onKeyDown={(event) => handleActionKeyDown(event, canPlayGame ? "/drag-game" : "/pricing")}
          >
            <div className="action-icon">🎮</div>
            <h3>{canPlayGame ? "Open Game Practice" : "Unlock Game Practice"}</h3>
            <p>{canPlayGame ? "Practice with interactive activities" : "Upgrade to unlock this mode"}</p>
          </div>
          <div
            className="action-card"
            role="button"
            tabIndex={0}
            aria-label="Buy courses"
            onClick={() => navigate("/pricing")}
            onKeyDown={(event) => handleActionKeyDown(event, "/pricing")}
          >
            <div className="action-icon">🛒</div>
            <h3>Buy Courses</h3>
            <p>Explore more courses</p>
          </div>
          <div
            className="action-card"
            role="button"
            tabIndex={0}
            aria-label="Open my learning"
            onClick={() => navigate("/my-courses")}
            onKeyDown={(event) => handleActionKeyDown(event, "/my-courses")}
          >
            <div className="action-icon">🏅</div>
            <h3>My Learning</h3>
            <p>View purchased courses</p>
          </div>
          <div
            className="action-card"
            role="button"
            tabIndex={0}
            aria-label="Open learning hub"
            onClick={() => navigate("/")}
            onKeyDown={(event) => handleActionKeyDown(event, "/")}
          >
            <div className="action-icon">👨‍👩‍👧</div>
            <h3>Learning Hub</h3>
            <p>Open the main practice area</p>
          </div>
        </div>
      </div>

    </div>
  );
}

