import { useState } from "react";
import "../styles/coursecard.css";

function CourseCard({ letter }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = () => {
    if (!letter) return;

    // Stop any ongoing speech before starting new
    window.speechSynthesis.cancel();

    const msg = new SpeechSynthesisUtterance(letter);
    msg.lang = "ti-ER"; // Tigrinya (if supported)

    setIsSpeaking(true);
    window.speechSynthesis.speak(msg);

    msg.onend = () => {
      setIsSpeaking(false);
    };
    msg.onerror = () => {
      setIsSpeaking(false);
      console.error("Speech synthesis error for letter:", letter);
    };
  };

  return (
    <div
      className={`course-card ${isSpeaking ? "speaking" : ""}`}
      onClick={speak}
      role="button"
      aria-label={`Speak the letter ${letter}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") speak();
      }}
    >
      <div className="letter">{letter}</div>
      <div className="card-footer">
        <span>{isSpeaking ? "Speaking..." : "Click to hear"}</span>
        <span className="sound-icon">🔊</span>
      </div>
    </div>
  );
}

export default CourseCard;