import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LetterCard from "../components/Letter/LetterCard";
import ProgressBar from "../components/ui/ProgressBar";
import Button from "../components/ui/Button";
import { fetchLetters, saveLearnedLetter, getMyCourses } from "../api/auth";
import { COURSE_CATALOG, COURSE_MAP } from "../data/courses";
import "../styles/home.css";

export default function Home() {
  const [letters, setLetters] = useState([]);
  const [learned, setLearned] = useState(new Set());
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [isSyncingCourses, setIsSyncingCourses] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("jwt");
  const totalLessons = purchasedCourses.reduce((count, courseId) => {
    const content = COURSE_MAP[courseId];
    return count + (content?.lessons?.length || 0);
  }, 0);

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        return;
      }

      setIsSyncingCourses(true);

      try {
        const coursesData = await getMyCourses();
        const purchased = Array.isArray(coursesData.purchasedCourses)
          ? coursesData.purchasedCourses
          : [];
        setPurchasedCourses(purchased);

        if (!purchased.length) {
          return;
        }

        const lettersData = await fetchLetters(token);
        setLetters(Array.isArray(lettersData) ? lettersData : []);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsSyncingCourses(false);
      }
    };

    loadData();
  }, [token]);

  const handleLearn = async (id) => {
    setLearned((prev) => new Set([...prev, id]));
    try {
      await saveLearnedLetter(token, id);
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  };

  const handleBuyCourse = () => {
    navigate("/pricing");
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    window.location.href = "/login";
  };

  const canPlayGame = purchasedCourses.some((courseId) => ["intermediate", "advanced"].includes(courseId));

  const renderLetterPracticeSection = () => (
    <div className="learning-section section-card">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Lesson Progress</span>
          <h2>Tigrinya Letter Practice</h2>
        </div>
        <p>Track what has been learned and keep daily practice focused.</p>
      </div>
      <ProgressBar current={learned.size} total={letters.length} />
      <LetterCard letters={letters} onLearn={handleLearn} />
    </div>
  );

  if (!token) {
    return (
      <div className="home home-shell">
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="hero-badge">Interactive Language Platform</span>
            <h1>Help children learn Tigrinya with structure, play, and progress they can track.</h1>
            <p>
              Tigrinya Kids combines guided lessons, pronunciation practice, and game-based reinforcement in a single learning space.
            </p>
            <div className="hero-actions auth-buttons">
              <Button onClick={() => navigate("/login")}>Login</Button>
              <Button className="button-secondary" onClick={() => navigate("/register")}>Create Account</Button>
            </div>
          </div>
          <div className="hero-aside">
            <div className="hero-note-card">
              <h3>What families get</h3>
              <ul>
                <li>Structured lessons by level</li>
                <li>Interactive games and recall practice</li>
                <li>Course access that grows with the learner</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!purchasedCourses.length) {
    return (
      <div className="home home-shell">
        <section className="hero-panel compact-panel">
          <div className="hero-copy">
            <span className="hero-badge">Ready To Start</span>
            <h1>Welcome back. Choose a course and turn this into a complete learning workspace.</h1>
            <p>
              Pick the plan that fits the learner's level, then unlock lessons, letters, and practice games in one place.
            </p>
          </div>
        </section>

        <div className="no-courses-message panel-surface">
            <h2>{isSyncingCourses ? "Syncing Courses" : "Get Started"}</h2>
            <p>
              {isSyncingCourses
                ? "Checking your enrolled courses..."
                : "You don't have any courses yet. Purchase a course to start learning!"}
            </p>
            
            <div className="available-courses-preview">
              <h3>Available Courses:</h3>
              <div className="course-preview-cards">
                {COURSE_CATALOG.map((course, index) => (
                  <div key={course.id} className="course-preview-card" style={{ background: course.color }}>
                    <img
                      src={course.image}
                      alt={`${course.title} visual`}
                      className="course-preview-image"
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      decoding="async"
                    />
                    <div className="course-preview-content">
                      <p className="course-preview-level">{course.level}</p>
                      <h4>{course.title}</h4>
                      <p className="price">${course.price.toFixed(2)}</p>
                      <ul>
                        {course.features.slice(0, 3).map((feature) => (
                          <li key={feature}>✓ {feature}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="cta-buttons">
              <Button onClick={handleBuyCourse}>View Courses</Button>
              <Button className="button-secondary" onClick={handleLogout}>Logout</Button>
            </div>
          </div>
      </div>
    );
  }

  return (
    <div className="home home-shell">
      <section className="hero-panel learner-hero">
        <div className="hero-copy">
          <span className="hero-badge">Your Learning Hub</span>
          <h1>Build consistent Tigrinya learning with clearer structure and stronger progress visibility.</h1>
          <p>
            Your purchased courses, letter practice, and interactive activities are organized below so you can move straight into learning.
          </p>
          <div className="hero-actions">
            <Button onClick={() => navigate("/my-courses")}>Open My Courses</Button>
            <Button className="button-secondary" onClick={() => navigate("/pricing")}>Add Another Course</Button>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <strong>{purchasedCourses.length}</strong>
            <span>Active courses</span>
          </div>
          <div className="stat-card">
            <strong>{letters.length}</strong>
            <span>Letters available</span>
          </div>
          <div className="stat-card">
            <strong>{totalLessons}</strong>
            <span>Learning modules</span>
          </div>
        </div>
      </section>

      <div className="purchased-courses-section section-card">
        <h2>Your Courses</h2>
        <div className="purchased-courses-grid">
          {purchasedCourses.map(courseId => {
            const content = COURSE_MAP[courseId];
            return content ? (
              <div 
                key={courseId} 
                className="purchased-course-card"
                style={{ background: content.color }}
              >
                <img
                  src={content.image}
                  alt={`${content.title} visual`}
                  className="purchased-course-image"
                  loading="lazy"
                  decoding="async"
                />
                <div className="course-chip-row">
                  <span className="course-chip">{content.level}</span>
                  <span className="course-chip">{content.duration}</span>
                </div>
                <h3>{content.title}</h3>
                <p>{content.description}</p>
                <ul className="course-lessons">
                  {content.lessons.map((lesson, index) => (
                    <li key={index}>✓ {lesson}</li>
                  ))}
                </ul>
                <Button
                  className="course-card-button"
                  onClick={() => navigate(courseId === "basic" ? "/alphabet-tigrinya" : `/lessons/${courseId}`)}
                >
                  Continue Course
                </Button>
              </div>
            ) : null;
          })}
        </div>
      </div>

      {renderLetterPracticeSection()}

      {canPlayGame ? (
        <div className="game-section section-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Interactive Practice</span>
              <h2>Game mode unlocked</h2>
            </div>
            <p>Use games to reinforce recall and keep practice engaging.</p>
          </div>
          <Button onClick={() => navigate("/dashboard")}>Open Activities</Button>
        </div>
      ) : (
        <div className="upgrade-prompt section-card">
          <p>Upgrade to Intermediate or Advanced to unlock games!</p>
          <Button onClick={handleBuyCourse}>Upgrade Now</Button>
        </div>
      )}
    </div>
  );
}

