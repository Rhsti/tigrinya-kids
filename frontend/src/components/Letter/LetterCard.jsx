import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../ui/Button";
import { getLetterVisual } from "../../data/letterVisuals";
import { fetchLetterAnalytics, saveLetterAnalytics } from "../../api/auth";
import "../../styles/lettercard.css";

const ANALYTICS_STORAGE_KEY = "letterPracticeAnalyticsV1";
const DEFAULT_LETTER_IMAGE = "/img/letter-words/default.svg";

const createEmptyAnalytics = () => ({
  totalAttempts: 0,
  correctAttempts: 0,
  perLetter: {},
  history: [],
});

const normalizeAnalytics = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    totalAttempts: Number(source.totalAttempts || 0),
    correctAttempts: Number(source.correctAttempts || 0),
    perLetter: source.perLetter && typeof source.perLetter === "object" ? source.perLetter : {},
    history: Array.isArray(source.history) ? source.history.slice(0, 20) : [],
  };
};

export default function LetterCard({ letters, onLearn }) {
  const letterList = useMemo(() => (Array.isArray(letters) ? letters : []), [letters]);
  const [index, setIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [dragRound, setDragRound] = useState(0);
  const [dropMap, setDropMap] = useState({});
  const [dragFeedback, setDragFeedback] = useState("");
  const [parentMode, setParentMode] = useState(false);
  const [analytics, setAnalytics] = useState(createEmptyAnalytics);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [photoSrc, setPhotoSrc] = useState(DEFAULT_LETTER_IMAGE);
  const audioRef = useRef(null);

  const current = letterList[index] || letterList[0] || null;
  const currentImage = current ? getLetterVisual(current) : "";

  const letterLookup = useMemo(() => {
    const map = {};
    letterList.forEach((letter) => {
      map[letter.id] = letter;
    });
    return map;
  }, [letterList]);

  const quizChoices = useMemo(() => {
    if (!current) {
      return [];
    }

    const pool = letterList.filter((item) => item.id !== current.id);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, current].sort(() => Math.random() - 0.5);
  }, [current, letterList]);

  const dragItems = useMemo(() => {
    if (!current) {
      return [];
    }

    const pool = letterList.filter((item) => item.id !== current.id);
    const roundOffset = pool.length ? dragRound % pool.length : 0;
    const rotatedPool = [...pool.slice(roundOffset), ...pool.slice(0, roundOffset)];
    const shuffled = [...rotatedPool].sort(() => Math.random() - 0.5).slice(0, 3);
    return [current, ...shuffled];
  }, [current, letterList, dragRound]);

  const shuffledWordBank = useMemo(
    () => [...dragItems].sort(() => Math.random() - 0.5),
    [dragItems]
  );

  const learnedCount = letterList.filter((item) => item.learned).length;

  useEffect(() => {
    setPhotoSrc(currentImage || DEFAULT_LETTER_IMAGE);
  }, [currentImage]);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      let localAnalytics = createEmptyAnalytics();

      try {
        const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
        if (raw) {
          localAnalytics = normalizeAnalytics(JSON.parse(raw));
          if (!cancelled) {
            setAnalytics(localAnalytics);
          }
        }
      } catch {
        localAnalytics = createEmptyAnalytics();
      }

      const token = localStorage.getItem("jwt");
      if (!token) {
        if (!cancelled) {
          setAnalyticsReady(true);
        }
        return;
      }

      try {
        const remote = await fetchLetterAnalytics();
        const remoteAnalytics = normalizeAnalytics(remote);
        const preferred = remoteAnalytics.totalAttempts >= localAnalytics.totalAttempts
          ? remoteAnalytics
          : localAnalytics;

        if (!cancelled) {
          setAnalytics(preferred);
        }
      } catch {
        // Keep local analytics when backend sync fails.
      } finally {
        if (!cancelled) {
          setAnalyticsReady(true);
        }
      }
    };

    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analytics));
  }, [analytics]);

  useEffect(() => {
    if (!analyticsReady) {
      return;
    }

    const token = localStorage.getItem("jwt");
    if (!token) {
      return;
    }

    const timer = setTimeout(() => {
      saveLetterAnalytics(analytics).catch(() => {
        // Local analytics remains available if network write fails.
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [analytics, analyticsReady]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  if (!current) {
    return <div>Loading...</div>;
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
    setIsAudioPlaying(false);
    setIsAudioLoading(false);
  };

  const speakTigrinyaFallback = () => {
    const utterance = new SpeechSynthesisUtterance(`${current.char} ${current.word}`);
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const preferredVoice = voices.find(
      (voice) => /ti-ER|tigrinya/i.test(`${voice.lang} ${voice.name}`)
    ) || voices.find((voice) => /ti/i.test(voice.lang));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = "ti-ER";
    }

    utterance.rate = 0.9;
    utterance.onstart = () => setIsAudioPlaying(true);
    utterance.onend = () => setIsAudioPlaying(false);
    utterance.onerror = () => {
      setIsAudioPlaying(false);
      setAudioError("No native Tigrinya voice found. Add Eritrean recordings in /audio/tigrinya-er.");
    };

    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(utterance);
  };

  const trackAttempt = (type, isCorrect, letterId) => {
    setAnalytics((prev) => {
      const nextPerLetter = { ...prev.perLetter };
      const currentLetterStats = nextPerLetter[letterId] || { attempts: 0, correct: 0 };

      nextPerLetter[letterId] = {
        attempts: currentLetterStats.attempts + 1,
        correct: currentLetterStats.correct + (isCorrect ? 1 : 0),
      };

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        letterId,
        type,
        correct: isCorrect,
        timestamp: new Date().toISOString(),
      };

      return {
        totalAttempts: prev.totalAttempts + 1,
        correctAttempts: prev.correctAttempts + (isCorrect ? 1 : 0),
        perLetter: nextPerLetter,
        history: [entry, ...(prev.history || [])].slice(0, 20),
      };
    });
  };

  const moveIndex = (delta) => {
    stopAudio();
    setIndex((prev) => (prev + delta + letterList.length) % letterList.length);
    setShowMeaning(false);
    setQuizAnswer("");
    setDropMap({});
    setDragFeedback("");
  };

  const playAudio = () => {
    setAudioError("");

    if (isAudioPlaying) {
      stopAudio();
      return;
    }

    if (current.sound) {
      setIsAudioLoading(true);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = current.sound;

      audio.oncanplaythrough = () => {
        setIsAudioLoading(false);
        setIsAudioPlaying(true);
      };
      audio.onended = () => {
        setIsAudioPlaying(false);
      };
      audio.onerror = () => {
        setIsAudioLoading(false);
        setIsAudioPlaying(false);
        setAudioError("Native recording missing. Using Tigrinya voice fallback.");
        speakTigrinyaFallback();
      };

      audio.play().catch(() => {
        setIsAudioLoading(false);
        setIsAudioPlaying(false);
        setAudioError("Audio blocked by browser. Using Tigrinya voice fallback.");
        speakTigrinyaFallback();
      });
    } else {
      speakTigrinyaFallback();
    }

    if (onLearn) {
      onLearn(current.id);
    }
  };

  const handleQuizPick = (pickedWord) => {
    setQuizAnswer(pickedWord);
    const isCorrect = pickedWord === current.word;
    trackAttempt("quiz", isCorrect, current.id);

    if (isCorrect && onLearn) {
      onLearn(current.id);
    }
  };

  const handleWordDragStart = (event, wordId) => {
    event.dataTransfer.setData("wordId", wordId);
  };

  const handleDropWord = (slotId, event) => {
    event.preventDefault();
    const draggedWordId = event.dataTransfer.getData("wordId");
    if (!draggedWordId) {
      return;
    }

    setDropMap((prev) => ({ ...prev, [slotId]: draggedWordId }));
  };

  const checkDragAnswers = () => {
    const allFilled = dragItems.every((item) => dropMap[item.id]);
    if (!allFilled) {
      setDragFeedback("Place all words before checking your answers.");
      return;
    }

    const correctCount = dragItems.filter((item) => dropMap[item.id] === item.id).length;
    const allCorrect = correctCount === dragItems.length;

    setDragFeedback(
      allCorrect
        ? "Excellent. All word matches are correct!"
        : `You matched ${correctCount}/${dragItems.length}. Try again for full score.`
    );

    trackAttempt("drag", allCorrect, current.id);

    if (allCorrect && onLearn) {
      dragItems.forEach((item) => onLearn(item.id));
    }
  };

  const nextDragRound = () => {
    setDropMap({});
    setDragFeedback("");
    setDragRound((prev) => prev + 1);
  };

  const quizCorrect = quizAnswer && quizAnswer === current.word;
  const usedWordIds = new Set(Object.values(dropMap));
  const overallAccuracy = analytics.totalAttempts
    ? Math.round((analytics.correctAttempts / analytics.totalAttempts) * 100)
    : 0;

  const perLetterRows = Object.entries(analytics.perLetter || {})
    .map(([letterId, stats]) => {
      const letter = letterLookup[letterId];
      const attempts = Number(stats.attempts || 0);
      const correct = Number(stats.correct || 0);
      const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
      return {
        letterId,
        label: letter ? `${letter.char} ${letter.word}` : letterId,
        attempts,
        correct,
        accuracy,
      };
    })
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)
    .slice(0, 8);

  return (
    <section className="letter-practice-shell">
      <header className="letter-practice-header">
        <div>
          <p className="letter-kicker">Interactive Letter Practice</p>
          <h3>{`Letter ${index + 1} of ${letterList.length}`}</h3>
        </div>
        <div className="letter-header-right">
          <p className="letter-progress-label">Learned: {learnedCount}</p>
          <Button className="button-secondary parent-toggle" onClick={() => setParentMode((prev) => !prev)}>
            {parentMode ? "Hide Parent Mode" : "Parent Mode"}
          </Button>
        </div>
      </header>

      <div className="letter-practice-grid">
        <article className="letter-card-main">
          <div className="letter-symbol">{current.char}</div>
          <p className="letter-word">{current.word}</p>
          <p className="letter-meaning">{showMeaning ? (current.meaning || "Meaning coming soon") : "Tap Reveal to show meaning"}</p>

          <div className="letter-actions">
            <Button className="button-secondary" onClick={() => setShowMeaning((prev) => !prev)}>
              {showMeaning ? "Hide Meaning" : "Reveal Meaning"}
            </Button>
            <Button onClick={playAudio}>
              {isAudioLoading ? "Loading..." : isAudioPlaying ? "Pause Audio" : "Play Sound"}
            </Button>
          </div>
          {audioError && <p className="audio-error">{audioError}</p>}
        </article>

        <article className="letter-photo-card">
          <img
            src={photoSrc}
            alt={`${current.char} ${current.word}`}
            className="letter-photo"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              setPhotoSrc(DEFAULT_LETTER_IMAGE);
            }}
          />
          <div className="letter-photo-caption">
            <strong>{current.word}</strong>
            <span>{current.meaning || "Vocabulary"}</span>
          </div>
        </article>
      </div>

      <section className="letter-quiz">
        <h4>Quick Match</h4>
        <p>Pick the word that matches letter: <strong>{current.char}</strong></p>
        <div className="quiz-choice-grid">
          {quizChoices.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`quiz-choice ${quizAnswer === item.word ? "active" : ""}`}
              onClick={() => handleQuizPick(item.word)}
            >
              {item.word}
            </button>
          ))}
        </div>
        {quizAnswer && (
          <p className={`quiz-feedback ${quizCorrect ? "good" : "bad"}`}>
            {quizCorrect ? "Great job, correct match!" : "Not quite. Try another option."}
          </p>
        )}
      </section>

      <section className="letter-quiz drag-section">
        <h4>Drag and Match</h4>
        <p>Drag each word to the correct letter card.</p>

        <div className="drag-layout">
          <div className="drag-slots">
            {dragItems.map((item) => {
              const droppedId = dropMap[item.id];
              const droppedItem = dragItems.find((dragItem) => dragItem.id === droppedId);
              const isCorrectSlot = droppedId && droppedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`drop-slot ${isCorrectSlot ? "correct" : ""}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDropWord(item.id, event)}
                >
                  <span className="drop-letter">{item.char}</span>
                  <img
                    src={getLetterVisual(item)}
                    alt={item.word}
                    className="drop-thumb"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = DEFAULT_LETTER_IMAGE;
                    }}
                  />
                  <span className="drop-word">{droppedItem ? droppedItem.word : "Drop word here"}</span>
                </div>
              );
            })}
          </div>

          <div className="word-bank">
            {shuffledWordBank.map((item) => (
              <button
                key={item.id}
                type="button"
                draggable={!usedWordIds.has(item.id)}
                onDragStart={(event) => handleWordDragStart(event, item.id)}
                className={`word-chip ${usedWordIds.has(item.id) ? "used" : ""}`}
              >
                {item.word}
              </button>
            ))}
          </div>
        </div>

        <div className="drag-actions">
          <Button className="button-secondary" onClick={nextDragRound}>New Round</Button>
          <Button onClick={checkDragAnswers}>Check Drag Answers</Button>
        </div>

        {dragFeedback && <p className="quiz-feedback good">{dragFeedback}</p>}
      </section>

      <div className="letter-nav-row">
        <Button className="button-secondary" onClick={() => moveIndex(-1)}>
          Previous
        </Button>
        <Button onClick={() => moveIndex(1)}>Next Letter</Button>
      </div>

      <div className="letter-dot-track" aria-label="Letter position">
        {letterList.map((item, dotIndex) => (
          <span
            key={item.id || dotIndex}
            className={`letter-dot ${dotIndex === index ? "active" : ""} ${item.learned ? "learned" : ""}`}
          />
        ))}
      </div>

      {parentMode && (
        <section className="parent-panel">
          <h4>Parent and Teacher Insights</h4>
          <div className="parent-stats">
            <div className="parent-stat-card">
              <strong>{analytics.totalAttempts}</strong>
              <span>Total attempts</span>
            </div>
            <div className="parent-stat-card">
              <strong>{analytics.correctAttempts}</strong>
              <span>Correct answers</span>
            </div>
            <div className="parent-stat-card">
              <strong>{overallAccuracy}%</strong>
              <span>Accuracy rate</span>
            </div>
          </div>

          <div className="parent-grid">
            <div className="parent-block">
              <h5>Letter Performance</h5>
              {perLetterRows.length ? (
                <ul className="parent-list">
                  {perLetterRows.map((row) => (
                    <li key={row.letterId}>
                      <span>{row.label}</span>
                      <span>{`${row.correct}/${row.attempts} (${row.accuracy}%)`}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="parent-empty">No analytics yet. Start practicing to generate insights.</p>
              )}
            </div>

            <div className="parent-block">
              <h5>Recent Activity</h5>
              {analytics.history.length ? (
                <ul className="parent-list">
                  {analytics.history.slice(0, 8).map((entry) => {
                    const label = letterLookup[entry.letterId]
                      ? `${letterLookup[entry.letterId].char} ${letterLookup[entry.letterId].word}`
                      : entry.letterId;

                    return (
                      <li key={entry.id}>
                        <span>{`${entry.type.toUpperCase()} - ${label}`}</span>
                        <span>{entry.correct ? "Correct" : "Try again"}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="parent-empty">No recent activity recorded yet.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </section>
  );
}