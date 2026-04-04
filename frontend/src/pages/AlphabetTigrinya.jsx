import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LetterCard from "../components/Letter/LetterCard";
import ProgressBar from "../components/ui/ProgressBar";
import Button from "../components/ui/Button";
import { fetchLetters, getMyCourses, saveLearnedLetter } from "../api/auth";
import "../styles/alphabet-tigrinya.css";

export default function AlphabetTigrinya() {
  const [letters, setLetters] = useState([]);
  const [learned, setLearned] = useState(new Set());
  const [hasCourses, setHasCourses] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const coursesData = await getMyCourses();
        const purchased = Array.isArray(coursesData?.purchasedCourses)
          ? coursesData.purchasedCourses
          : [];

        if (!purchased.length) {
          setHasCourses(false);
          return;
        }

        const lettersData = await fetchLetters();
        const list = Array.isArray(lettersData) ? lettersData : [];
        setLetters(list);
        setLearned(new Set(list.filter((item) => item.learned).map((item) => item.id)));
      } catch (err) {
        console.error("Failed to load alphabet course:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLearn = async (id) => {
    setLearned((prev) => new Set([...prev, id]));
    try {
      await saveLearnedLetter(id);
    } catch (err) {
      console.error("Failed to save letter progress:", err);
    }
  };

  if (loading) {
    return (
      <div className="alphabet-page">
        <div className="alphabet-shell">
          <p>Loading Alphabet Tigrinya...</p>
        </div>
      </div>
    );
  }

  if (!hasCourses) {
    return (
      <div className="alphabet-page">
        <div className="alphabet-shell alphabet-empty">
          <h1>Alphabet Tigrinya</h1>
          <p>Purchase a course to unlock this alphabet practice page.</p>
          <Button onClick={() => navigate("/pricing")}>View Courses</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="alphabet-page">
      <div className="alphabet-shell">
        <div className="alphabet-header">
          <span className="alphabet-badge">Course</span>
          <h1>Alphabet Tigrinya</h1>
          <p>Practice letters in one dedicated course page.</p>
          <div className="alphabet-actions">
            <Button className="button-secondary" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>

        <div className="alphabet-content">
          <ProgressBar current={learned.size} total={letters.length} />
          <LetterCard letters={letters} onLearn={handleLearn} />
        </div>
      </div>
    </div>
  );
}
