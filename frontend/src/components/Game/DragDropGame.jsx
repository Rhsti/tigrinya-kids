import { useState } from "react";
import "../../styles//dragdrop.css";

export default function DragDropGame({ letters, onComplete }) {
  const [correct, setCorrect] = useState([]);
  const [message, setMessage] = useState("");

  const handleClick = (letter) => {
    if (!correct.includes(letter.id)) {
      setCorrect([...correct, letter.id]);
      onComplete(letter.id);
      setMessage("✅ Great job!");
      setTimeout(() => setMessage(""), 1500);
    }
  };

  return (
    <div className="game-wrapper">
      <h2 className="game-title">
        Drag the correct letter to the matching word!
      </h2>

      <div className="game-grid">
        {letters.map((l) => (
          <div
            key={l.id}
            className={`game-card ${
              correct.includes(l.id) ? "completed" : ""
            }`}
          >
            <div className="letter">{l.char}</div>
            <div className="word">{l.word}</div>

            {!correct.includes(l.id) && (
              <button
                className="match-btn"
                onClick={() => handleClick(l)}
              >
                Match
              </button>
            )}

            {correct.includes(l.id) && (
              <div className="done">✔</div>
            )}
          </div>
        ))}
      </div>

      <div className="progress">
        Completed: {correct.length} / {letters.length}
      </div>

      {message && <div className="feedback">{message}</div>}
    </div>
  );
}