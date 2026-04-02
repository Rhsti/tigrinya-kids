import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { letters as letterData } from "../data/letters";
import "../styles/draggame.css";

const ItemType = "LETTER";

/* ================= DRAG LETTER ================= */
const Letter = ({ letter, disabled }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType,
    item: { letter },
    canDrag: !disabled,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [letter, disabled]);

  return (
    <div
      ref={drag}
      className={`letter ${isDragging ? "dragging" : ""} ${disabled ? "disabled" : ""}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {letter}
    </div>
  );
};

/* ================= DROP TARGET ================= */
const Target = ({ letter, onCorrect, onIncorrect, matched, disabled }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemType,
    drop: (item) => {
      if (disabled) return;
      if (item.letter === letter) {
        onCorrect(letter);
      } else {
        onIncorrect();
      }
    },
    canDrop: () => !disabled && !matched.includes(letter),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [disabled, letter, matched, onCorrect, onIncorrect]);

  return (
    <div
      ref={drop}
      className={`target ${isOver && canDrop ? "hovered" : ""} ${
        matched.includes(letter) ? "matched" : ""
      } ${disabled ? "disabled" : ""}`}
    >
      {letter}
    </div>
  );
};

/* ================= WORD-IMG DRAG ================= */
const WordImgCard = ({ entry, disabled }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType,
    item: { letter: entry.id },
    canDrag: !disabled,
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [entry.id, disabled]);

  return (
    <div
      ref={drag}
      className={`word-img-card ${isDragging ? "dragging" : ""} ${disabled ? "disabled" : ""}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <img src={entry.img} alt={entry.word} className="word-img-thumb" />
      <span className="word-img-char">{entry.char}</span>
    </div>
  );
};

const WordDropTarget = ({ entry, onCorrect, onIncorrect, wordMatched, disabled }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemType,
    drop: (item) => {
      if (disabled) return;
      if (item.letter === entry.id) {
        onCorrect(entry.id);
      } else {
        onIncorrect();
      }
    },
    canDrop: () => !disabled && !wordMatched.includes(entry.id),
    collect: (monitor) => ({ isOver: !!monitor.isOver(), canDrop: !!monitor.canDrop() }),
  }), [disabled, entry.id, wordMatched, onCorrect, onIncorrect]);

  return (
    <div
      ref={drop}
      className={`word-drop-target ${isOver && canDrop ? "hovered" : ""} ${wordMatched.includes(entry.id) ? "matched" : ""} ${disabled ? "disabled" : ""}`}
    >
      {entry.word}
    </div>
  );
};

/* ================= MAIN GAME ================= */
const shuffle = (items) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const leaderboardKey = "tgk_game_leaderboard";

const DragGame = () => {
  const navigate = useNavigate();
  const allLetters = useMemo(
    () => Array.from(new Set(letterData.map((entry) => entry.char).filter(Boolean))),
    []
  );
  const levelMap = useMemo(
    () => ({
      starter: allLetters.slice(0, Math.min(12, allLetters.length)),
      builder: allLetters.slice(0, Math.min(24, allLetters.length)),
      champion: allLetters,
    }),
    [allLetters]
  );

  const [level, setLevel] = useState("starter");
  const baseLetters = useMemo(() => levelMap[level] || levelMap.starter, [levelMap, level]);
  const memorySymbols = useMemo(() => baseLetters.slice(0, Math.min(6, baseLetters.length)), [baseLetters]);
  const quizTotalTime = useMemo(
    () => (level === "starter" ? 42 : level === "builder" ? 35 : 30),
    [level]
  );
  const quizQuestions = useMemo(() => {
    const levelWordCount = level === "starter" ? 12 : level === "builder" ? 24 : Number.MAX_SAFE_INTEGER;
    const quizEntries = letterData
      .filter((entry) => entry.char && entry.word)
      .slice(0, levelWordCount)
      .slice(0, level === "starter" ? 8 : level === "builder" ? 10 : 12);

    if (!quizEntries.length) {
      const one = baseLetters[0] || "ኣ";
      const two = baseLetters[1] || one;
      const three = baseLetters[2] || two;
      const four = baseLetters[3] || three;
      return [
        { q: `Pick the matching letter: ${one}`, choices: shuffle([one, two, three]).slice(0, 3), correct: one, type: "letter" },
        { q: `Pick the matching letter: ${two}`, choices: shuffle([two, three, four]).slice(0, 3), correct: two, type: "letter" },
        { q: `Pick the matching letter: ${three}`, choices: shuffle([three, four, one]).slice(0, 3), correct: three, type: "letter" },
        { q: `Pick the matching letter: ${four}`, choices: shuffle([four, two, one]).slice(0, 3), correct: four, type: "letter" },
      ];
    }

    const pickChoices = (correct, poolValues) => {
      const distractors = shuffle(poolValues.filter((v) => v !== correct)).slice(0, 3);
      return shuffle([correct, ...distractors]);
    };

    return shuffle(
      quizEntries.map((entry, idx) => {
        const variant = idx % 3;
        if (variant === 0) {
          return {
            q: `Which word starts with ${entry.char}?`,
            choices: pickChoices(entry.word, quizEntries.map((it) => it.word)),
            correct: entry.word,
            type: "char-to-word",
            promptLabel: "Letter to Word",
            promptImage: entry.img || null,
          };
        }
        if (variant === 1) {
          return {
            q: `Which letter starts this word: ${entry.word}?`,
            choices: pickChoices(entry.char, quizEntries.map((it) => it.char)),
            correct: entry.char,
            type: "word-to-char",
            promptLabel: "Word to Letter",
            promptImage: entry.img || null,
          };
        }
        const meaningPool = quizEntries.filter((it) => it.meaning);
        if (meaningPool.length > 3 && entry.meaning) {
          return {
            q: `Which Tigrinya word means "${entry.meaning}"?`,
            choices: pickChoices(entry.word, meaningPool.map((it) => it.word)),
            correct: entry.word,
            type: "meaning-to-word",
            promptLabel: "Meaning to Word",
            promptImage: entry.img || null,
          };
        }
        return {
          q: `Pick the matching letter: ${entry.char}`,
          choices: pickChoices(entry.char, quizEntries.map((it) => it.char)),
          correct: entry.char,
          type: "letter",
          promptLabel: "Letter Match",
          promptImage: entry.img || null,
        };
      })
    );
  }, [baseLetters, level]);

  const [mode, setMode] = useState("drag");
  const [dragVariant, setDragVariant] = useState("letter"); // "letter" | "word-img"
  const [matched, setMatched] = useState([]);
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(() => Number(localStorage.getItem("tgk_game_streak") || 0));
  const [rewardPoints, setRewardPoints] = useState(() => Number(localStorage.getItem("tgk_game_points") || 0));
  const [leaderboard, setLeaderboard] = useState(() => {
    try {
      const savedBoard = JSON.parse(localStorage.getItem(leaderboardKey) || "[]");
      return Array.isArray(savedBoard) ? savedBoard : [];
    } catch {
      return [];
    }
  });
  const [message, setMessage] = useState("Drag each letter into its matching target.");
  const [targetOrder, setTargetOrder] = useState(() => shuffle(baseLetters));
  const [bankOrder, setBankOrder] = useState(() => shuffle(baseLetters));

  const wordPoolByLevel = useMemo(() => {
    const entries = letterData.filter((entry) => entry.char && entry.word && entry.img);
    return {
      starter: entries.slice(0, Math.min(12, entries.length)),
      builder: entries.slice(0, Math.min(24, entries.length)),
      champion: entries,
    };
  }, []);
  const wordPool = useMemo(
    () => wordPoolByLevel[level] || wordPoolByLevel.starter,
    [wordPoolByLevel, level]
  );
  const [wordMatched, setWordMatched] = useState([]);
  const [wordPoolOrder, setWordPoolOrder] = useState(() => shuffle(wordPool));
  const [wordTargetOrder, setWordTargetOrder] = useState(() => shuffle(wordPool));
  const [wordAttempts, setWordAttempts] = useState(0);
  const wordRoundLogged = useRef(false);

  const [memoryVariant, setMemoryVariant] = useState("letter"); // "letter" | "word"
  const [memoryCards, setMemoryCards] = useState([]);
  const [memoryFlipped, setMemoryFlipped] = useState([]);
  const [memoryMatches, setMemoryMatches] = useState([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryLocked, setMemoryLocked] = useState(false);

  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(() => quizTotalTime);
  const [quizActive, setQuizActive] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState(null);

  const roundLogged = useRef(false);

  const accuracy = useMemo(() => {
    if (!attempts) return 100;
    return Math.round((matched.length / attempts) * 100);
  }, [matched.length, attempts]);

  const wordAccuracy = useMemo(() => {
    if (!wordAttempts) return 100;
    return Math.round((wordMatched.length / wordAttempts) * 100);
  }, [wordMatched.length, wordAttempts]);

  const isLetterCompleted = matched.length === baseLetters.length;
  const isWordCompleted = wordMatched.length === wordPool.length && wordPool.length > 0;
  const isCompleted = dragVariant === "word-img"
    ? isWordCompleted
    : isLetterCompleted;
  const interactionsLocked = gameOver || isCompleted;

  const today = () => new Date().toISOString().slice(0, 10);

  const playBeep = (frequency, duration = 0.08, type = "sine") => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      osc.onended = () => ctx.close();
    } catch {
      // Audio is optional feedback.
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      roundLogged.current = false;
      wordRoundLogged.current = false;
      setMatched([]);
      setWordMatched([]);
      setWordAttempts(0);
      setStreak(0);
      setAttempts(0);
      setShowConfetti(false);
      setGameOver(false);
      setTimeLeft(60);
      setTimerActive(false);
      setTargetOrder(shuffle(baseLetters));
      setBankOrder(shuffle(baseLetters));
      setWordPoolOrder(shuffle(wordPool));
      setWordTargetOrder(shuffle(wordPool));
      setMessage(
        dragVariant === "word-img"
          ? "Level updated. Drag each image to the matching Tigrinya word."
          : "Level updated. Start matching letters."
      );

      if (mode === "memory") {
        const memoryWordCount = level === "starter" ? 12 : level === "builder" ? 24 : Number.MAX_SAFE_INTEGER;
        const memoryCardsOnLevel = memoryVariant === "word"
          ? shuffle(
              letterData
                .filter((entry) => entry.word)
                .slice(0, memoryWordCount)
                .flatMap((entry, idx) => [
                  { id: `char_${idx}`, value: entry.char, pairKey: `pair_${idx}`, type: "char" },
                  { id: `word_${idx}`, value: entry.word, pairKey: `pair_${idx}`, type: "word" },
                ])
            )
          : shuffle(
              memorySymbols.flatMap((value, idx) => [
                { id: `a_${idx}`, value, pairKey: value },
                { id: `b_${idx}`, value, pairKey: value },
              ])
            );
        setMemoryCards(memoryCardsOnLevel);
        setMemoryFlipped([]);
        setMemoryMatches([]);
        setMemoryMoves(0);
        setMemoryLocked(false);
      }

      if (mode === "quiz") {
        setQuizIndex(0);
        setQuizScore(0);
        setQuizTimeLeft(quizTotalTime);
        setQuizActive(true);
        setQuizFinished(false);
        setQuizCorrectCount(0);
        setQuizStreak(0);
        setQuizFeedback(null);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [baseLetters, wordPool, dragVariant, mode, level, memoryVariant, memorySymbols, quizTotalTime]);

  const saveLeaderboardEntry = ({ modeName, score, accuracyValue = 100, duration = null }) => {
    const next = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      mode: modeName,
      score,
      accuracy: accuracyValue,
      duration,
      at: new Date().toISOString(),
    };
    let board = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(leaderboardKey) || "[]");
      board = Array.isArray(parsed) ? parsed : [];
    } catch {
      board = [];
    }

    const sorted = [next, ...board]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8);

    localStorage.setItem(leaderboardKey, JSON.stringify(sorted));
    setLeaderboard(sorted);
  };

  useEffect(() => {
    if (mode !== "drag-timed") return;

    if (interactionsLocked || !timerActive) return;

    const tick = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          setGameOver(true);
          setTimerActive(false);
          setMessage("Time is up! Press Play Again to retry timed mode.");
          playBeep(180, 0.16, "sawtooth");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [mode, timerActive, interactionsLocked]);

  useEffect(() => {
    if (mode !== "quiz" || quizFinished || !quizActive) return;
    const tick = setInterval(() => {
      setQuizTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          setQuizActive(false);
          setQuizFinished(true);
          setMessage("Quiz time ended. Great effort.");
          playBeep(220, 0.12, "sawtooth");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [mode, quizActive, quizFinished]);

  useEffect(() => {
    if (!isCompleted || mode === "memory" || mode === "quiz") return;

    window.setTimeout(() => {
      setTimerActive(false);
      setShowConfetti(true);
      setMessage(mode === "drag-timed" ? "Challenge complete! Big win." : "Perfect round complete.");
    }, 0);
    playBeep(760, 0.1, "triangle");
    setTimeout(() => playBeep(980, 0.12, "triangle"), 110);

    const currentDay = today();
    const lastPlayed = localStorage.getItem("tgk_game_last_played") || "";
    const savedStreak = Number(localStorage.getItem("tgk_game_streak") || 0);
    const savedPoints = Number(localStorage.getItem("tgk_game_points") || 0);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    let nextStreak = savedStreak;
    if (lastPlayed === currentDay) {
      nextStreak = savedStreak;
    } else if (lastPlayed === yesterdayKey) {
      nextStreak = savedStreak + 1;
    } else {
      nextStreak = 1;
    }

    const completionBonus = mode === "drag-timed" ? 40 : 25;
    const streakBonus = Math.min(nextStreak * 3, 30);
    const nextPoints = savedPoints + completionBonus + streakBonus;

    localStorage.setItem("tgk_game_last_played", currentDay);
    localStorage.setItem("tgk_game_streak", String(nextStreak));
    localStorage.setItem("tgk_game_points", String(nextPoints));
    window.setTimeout(() => {
      setDailyStreak(nextStreak);
      setRewardPoints(nextPoints);
    }, 0);

    if (!roundLogged.current) {
      const usedSeconds = mode === "drag-timed" ? 60 - timeLeft : null;
      const roundScore = matched.length * 22 + streak * 4 + accuracy;
      window.setTimeout(() => {
        saveLeaderboardEntry({
          modeName: mode === "drag-timed" ? "Timed Drag" : "Classic Drag",
          score: roundScore,
          accuracyValue: accuracy,
          duration: usedSeconds,
        });
      }, 0);
      roundLogged.current = true;
    }
  }, [isCompleted, mode, timeLeft, matched.length, streak, accuracy]);

  const handleCorrect = (letter) => {
    if (interactionsLocked) return;
    if (!matched.includes(letter)) {
      if (mode === "drag-timed" && !timerActive) {
        setTimerActive(true);
      }
      setMatched((prev) => [...prev, letter]);
      setStreak((prev) => prev + 1);
      setAttempts((prev) => prev + 1);
      setMessage("Nice match! Keep the streak alive.");
      playBeep(620, 0.06, "triangle");
    }
  };

  const handleIncorrect = () => {
    if (interactionsLocked) return;
    if (mode === "drag-timed" && !timerActive) {
      setTimerActive(true);
    }
    setAttempts((prev) => prev + 1);
    setStreak(0);
    setMessage("Not this target. Try another one.");
    playBeep(240, 0.08, "square");
  };

  const handleWordCorrect = (id) => {
    if (interactionsLocked) return;
    if (!wordMatched.includes(id)) {
      if (mode === "drag-timed" && !timerActive) setTimerActive(true);
      setWordMatched((prev) => [...prev, id]);
      setStreak((prev) => prev + 1);
      setWordAttempts((prev) => prev + 1);
      setMessage("Great match! Word identified.");
      playBeep(620, 0.06, "triangle");
    }
  };

  const handleWordIncorrect = () => {
    if (interactionsLocked) return;
    if (mode === "drag-timed" && !timerActive) setTimerActive(true);
    setWordAttempts((prev) => prev + 1);
    setStreak(0);
    setMessage("Not that word. Try another target.");
    playBeep(240, 0.08, "square");
  };

  useEffect(() => {
    if (!isWordCompleted || mode === "memory" || mode === "quiz" || dragVariant !== "word-img") return;
    if (wordRoundLogged.current) return;
    window.setTimeout(() => {
      setTimerActive(false);
      setShowConfetti(true);
      setMessage(mode === "drag-timed" ? "Word challenge complete! Big win." : "All words matched. Perfect!");
      saveLeaderboardEntry({
        modeName: mode === "drag-timed" ? "Timed Word Drag" : "Word Drag",
        score: roundScore,
        accuracyValue: wordAccuracy,
        duration: mode === "drag-timed" ? 60 - timeLeft : null,
      });
    }, 0);
    playBeep(760, 0.1, "triangle");
    setTimeout(() => playBeep(980, 0.12, "triangle"), 110);
    const roundScore = wordMatched.length * 22 + streak * 4 + wordAccuracy;
    wordRoundLogged.current = true;
  }, [isWordCompleted, mode, dragVariant, wordMatched.length, streak, wordAccuracy, timeLeft]);

  function resetMemory(variant) {
    const activeVariant = variant !== undefined ? variant : memoryVariant;
    let cards;
    if (activeVariant === "word") {
      const wordCount = level === "starter" ? 12 : level === "builder" ? 24 : Number.MAX_SAFE_INTEGER;
      const pool = letterData.filter((l) => l.word).slice(0, wordCount);
      cards = shuffle(
        pool.flatMap((entry, idx) => [
          { id: `char_${idx}`, value: entry.char, pairKey: `pair_${idx}`, type: "char" },
          { id: `word_${idx}`, value: entry.word, pairKey: `pair_${idx}`, type: "word" },
        ])
      );
    } else {
      cards = shuffle(
        memorySymbols.flatMap((value, idx) => [
          { id: `a_${idx}`, value, pairKey: value },
          { id: `b_${idx}`, value, pairKey: value },
        ])
      );
    }
    setMemoryCards(cards);
    setMemoryFlipped([]);
    setMemoryMatches([]);
    setMemoryMoves(0);
    setMemoryLocked(false);
  }

  function resetQuiz() {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizTimeLeft(quizTotalTime);
    setQuizActive(true);
    setQuizFinished(false);
    setQuizCorrectCount(0);
    setQuizStreak(0);
    setQuizFeedback(null);
  }

  const startNewRound = (nextMode = mode) => {
    roundLogged.current = false;
    wordRoundLogged.current = false;
    setMatched([]);
    setWordMatched([]);
    setWordAttempts(0);
    setStreak(0);
    setAttempts(0);
    setShowConfetti(false);
    setGameOver(false);
    setMode(nextMode);
    setTimeLeft(60);
    setTimerActive(false);
    setMessage("New round started. You can do this.");
    setTargetOrder(shuffle(baseLetters));
    setBankOrder(shuffle(baseLetters));
    setWordPoolOrder(shuffle(wordPool));
    setWordTargetOrder(shuffle(wordPool));

    if (nextMode === "memory") {
      resetMemory();
      setMessage("Flip cards and match the same letters.");
    }
    if (nextMode === "quiz") {
      resetQuiz();
      setMessage("Answer quickly before time runs out.");
    }
  };

  const handleMemoryFlip = (cardId) => {
    if (memoryLocked || memoryMatches.includes(cardId)) return;
    if (memoryFlipped.includes(cardId)) return;

    const nextFlipped = [...memoryFlipped, cardId];
    setMemoryFlipped(nextFlipped);

    if (nextFlipped.length < 2) return;

    setMemoryMoves((prev) => prev + 1);
    const [aId, bId] = nextFlipped;
    const a = memoryCards.find((x) => x.id === aId);
    const b = memoryCards.find((x) => x.id === bId);

    if (a && b && a.pairKey === b.pairKey) {
      setMemoryMatches((prev) => [...prev, aId, bId]);
      setMemoryFlipped([]);
      playBeep(600, 0.06, "triangle");
    } else {
      setMemoryLocked(true);
      playBeep(260, 0.08, "square");
      setTimeout(() => {
        setMemoryFlipped([]);
        setMemoryLocked(false);
      }, 600);
    }
  };

  const allMemoryMatched = memoryCards.length > 0 && memoryMatches.length === memoryCards.length;
  const memoryPairTotal = Math.floor(memoryCards.length / 2);
  const memoryPairsSolved = Math.floor(memoryMatches.length / 2);
  const memoryProgress = memoryPairTotal
    ? Math.round((memoryPairsSolved / memoryPairTotal) * 100)
    : 0;

  useEffect(() => {
    if (mode !== "memory" || !allMemoryMatched || roundLogged.current) return;
    window.setTimeout(() => {
      setShowConfetti(true);
      setMessage("Memory challenge complete!");
      saveLeaderboardEntry({
        modeName: memoryVariant === "word" ? "Word Memory" : "Memory Flip",
        score,
        accuracyValue: 100,
        duration: null,
      });
    }, 0);
    const score = Math.max(30, 140 - memoryMoves * 8);
    roundLogged.current = true;
  }, [mode, allMemoryMatched, memoryMoves, memoryVariant]);

  const answerQuiz = useCallback((choice) => {
    if (mode !== "quiz" || quizFinished || !quizActive || quizFeedback) return;
    const current = quizQuestions[quizIndex];
    const correct = choice === current.correct;
    const speedBonus = correct ? Math.min(12, Math.floor(quizTimeLeft / 3)) : 0;
    const streakBonus = correct ? Math.min(12, quizStreak * 2) : 0;
    const points = correct ? 24 + speedBonus + streakBonus : 0;
    setQuizScore((prev) => prev + points);
    setQuizCorrectCount((prev) => prev + (correct ? 1 : 0));
    setQuizStreak((prev) => (correct ? prev + 1 : 0));
    setQuizFeedback({ choice, correct, points });
    playBeep(correct ? 640 : 260, 0.07, correct ? "triangle" : "square");

    setMessage(
      correct
        ? `Great! +${points} points${speedBonus ? ` (${speedBonus} speed bonus)` : ""}`
        : "Not quite. Stay focused for the next one."
    );

    const nextQuestion = () => {
      setQuizFeedback(null);
      if (quizIndex + 1 >= quizQuestions.length) {
        setQuizFinished(true);
        setQuizActive(false);
        setShowConfetti(true);
        const finalCorrect = quizCorrectCount + (correct ? 1 : 0);
        const perfectBonus = finalCorrect === quizQuestions.length ? 35 : 0;
        const finalScore = quizScore + points + perfectBonus;
        const acc = Math.round(((finalCorrect / quizQuestions.length) * 100));
        setMessage(
          finalCorrect === quizQuestions.length
            ? `Perfect run! +${perfectBonus} bonus.`
            : correct
              ? "Quiz complete!"
              : "Quiz finished. Try for a higher score."
        );
        saveLeaderboardEntry({ modeName: "Speed Quiz", score: finalScore, accuracyValue: acc, duration: quizTotalTime - quizTimeLeft });
        roundLogged.current = true;
        return;
      }
      setQuizIndex((prev) => prev + 1);
    };

    window.setTimeout(nextQuestion, 420);
  }, [
    mode,
    quizFinished,
    quizActive,
    quizFeedback,
    quizQuestions,
    quizIndex,
    quizTimeLeft,
    quizStreak,
    quizScore,
    quizCorrectCount,
    quizTotalTime,
  ]);

  useEffect(() => {
    if (mode !== "quiz" || quizFinished || !quizActive || quizFeedback) return;

    const onKeyDown = (event) => {
      const index = Number(event.key) - 1;
      if (Number.isNaN(index) || index < 0 || index > 3) return;
      const current = quizQuestions[quizIndex];
      if (!current || !current.choices[index]) return;
      answerQuiz(current.choices[index]);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, quizFinished, quizActive, quizFeedback, quizQuestions, quizIndex, answerQuiz]);

  const handleReset = () => startNewRound(mode);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="game-page">
      <div className="game-container">
        {showConfetti && (
          <div className="confetti-layer" aria-hidden="true">
            {Array.from({ length: 22 }).map((_, i) => (
              <span key={i} className="confetti-bit" style={{ left: `${(i * 11) % 100}%`, animationDelay: `${(i % 6) * 70}ms` }} />
            ))}
          </div>
        )}
        <div className="game-topbar">
          <button className="mode-btn" type="button" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
          <span className="level-pill">Level: {level}</span>
        </div>
        <h1>Letter Match Arena</h1>
        <p className="game-subtitle">Full-screen game mode with level progression, drag challenges, memory drills, and quiz rounds.</p>

        <div className="level-controls">
          <button type="button" className={`mode-btn ${level === "starter" ? "active" : ""}`} onClick={() => setLevel("starter")}>Starter</button>
          <button type="button" className={`mode-btn ${level === "builder" ? "active" : ""}`} onClick={() => setLevel("builder")}>Builder</button>
          <button type="button" className={`mode-btn ${level === "champion" ? "active" : ""}`} onClick={() => setLevel("champion")}>Champion</button>
        </div>

        <div className="mode-controls">
          <button
            type="button"
            className={`mode-btn ${mode === "drag" ? "active" : ""}`}
            onClick={() => startNewRound("drag")}
          >
            Classic Mode
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === "drag-timed" ? "active" : ""}`}
            onClick={() => startNewRound("drag-timed")}
          >
            Timed Challenge
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === "memory" ? "active" : ""}`}
            onClick={() => startNewRound("memory")}
          >
            Memory Flip
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === "quiz" ? "active" : ""}`}
            onClick={() => startNewRound("quiz")}
          >
            Speed Quiz
          </button>
          {mode === "drag-timed" && <div className={`timer-chip ${timeLeft <= 15 ? "danger" : ""}`}>Time: {timeLeft}s</div>}
          {mode === "quiz" && <div className={`timer-chip ${quizTimeLeft <= 10 ? "danger" : ""}`}>Quiz: {quizTimeLeft}s</div>}
        </div>

        <div className="scoreboard">
          <div className="score-pill">
            Matched: {dragVariant === "word-img" && (mode === "drag" || mode === "drag-timed")
              ? `${wordMatched.length}/${wordPool.length}`
              : `${matched.length}/${baseLetters.length}`}
          </div>
          <div className="score-pill">Streak: {streak}</div>
          <div className="score-pill">
            Accuracy: {dragVariant === "word-img" && (mode === "drag" || mode === "drag-timed")
              ? `${wordAccuracy}%`
              : `${accuracy}%`}
          </div>
          <div className="score-pill">Mode Level: {level}</div>
          <div className="score-pill">Daily Streak: {dailyStreak} day(s)</div>
          <div className="score-pill">Rewards: {rewardPoints} pts</div>
        </div>

        {(mode === "drag" || mode === "drag-timed") && (
          <>
            <div className="drag-variant-controls">
              <button
                type="button"
                className={`mode-btn ${dragVariant === "letter" ? "active" : ""}`}
                onClick={() => {
                  setDragVariant("letter");
                  roundLogged.current = false;
                  setMatched([]);
                  setAttempts(0);
                  setStreak(0);
                  setShowConfetti(false);
                  setGameOver(false);
                  setTargetOrder(shuffle(baseLetters));
                  setBankOrder(shuffle(baseLetters));
                  setMessage("Drag each letter into its matching target.");
                }}
              >
                Letter Drag
              </button>
              <button
                type="button"
                className={`mode-btn ${dragVariant === "word-img" ? "active" : ""}`}
                onClick={() => {
                  setDragVariant("word-img");
                  wordRoundLogged.current = false;
                  setWordMatched([]);
                  setWordAttempts(0);
                  setStreak(0);
                  setShowConfetti(false);
                  setGameOver(false);
                  setWordPoolOrder(shuffle(wordPool));
                  setWordTargetOrder(shuffle(wordPool));
                  setMessage("Drag each image to its matching Tigrinya word.");
                }}
              >
                Word + Image Drag
              </button>
            </div>

            {dragVariant === "letter" && (
              <>
                <div className="letters-row">
                  {bankOrder.map((l) =>
                    matched.includes(l) ? null : <Letter key={l} letter={l} disabled={interactionsLocked} />
                  )}
                </div>
                <div className="targets-row">
                  {targetOrder.map((l) => (
                    <Target
                      key={l}
                      letter={l}
                      onCorrect={handleCorrect}
                      onIncorrect={handleIncorrect}
                      matched={matched}
                      disabled={interactionsLocked}
                    />
                  ))}
                </div>
              </>
            )}

            {dragVariant === "word-img" && (
              <>
                <p className="word-drag-hint">Drag the image card to the matching Tigrinya word below.</p>
                <div className="word-img-bank">
                  {wordPoolOrder.map((entry) =>
                    wordMatched.includes(entry.id) ? null : (
                      <WordImgCard key={entry.id} entry={entry} disabled={interactionsLocked} />
                    )
                  )}
                </div>
                <div className="word-target-row">
                  {wordTargetOrder.map((entry) => (
                    <WordDropTarget
                      key={entry.id}
                      entry={entry}
                      onCorrect={handleWordCorrect}
                      onIncorrect={handleWordIncorrect}
                      wordMatched={wordMatched}
                      disabled={interactionsLocked}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {mode === "memory" && (
          <>
            <div className="memory-variant-controls">
              <button
                type="button"
                className={`mode-btn ${memoryVariant === "letter" ? "active" : ""}`}
                onClick={() => {
                  setMemoryVariant("letter");
                  resetMemory("letter");
                }}
              >
                Letter Match
              </button>
              <button
                type="button"
                className={`mode-btn ${memoryVariant === "word" ? "active" : ""}`}
                onClick={() => {
                  setMemoryVariant("word");
                  resetMemory("word");
                }}
              >
                Word Match
              </button>
            </div>
            {memoryVariant === "word" && (
              <div className="word-memory-meta" aria-live="polite">
                <span className="word-memory-pill">Pairs: {memoryPairsSolved}/{memoryPairTotal}</span>
                <span className="word-memory-pill">Moves: {memoryMoves}</span>
                <span className="word-memory-pill">Progress: {memoryProgress}%</span>
              </div>
            )}
          <div className="memory-grid">
            {memoryCards.map((card) => {
              const revealed = memoryFlipped.includes(card.id) || memoryMatches.includes(card.id);
              const matched = memoryMatches.includes(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`memory-card ${revealed ? "revealed" : ""} ${card.type === "char" ? "memory-char-card" : ""} ${card.type === "word" ? "memory-word-card" : ""} ${matched ? "memory-matched" : ""}`}
                  onClick={() => handleMemoryFlip(card.id)}
                  disabled={memoryLocked || memoryMatches.includes(card.id)}
                >
                  {revealed ? (
                    <span className="memory-face-wrap">
                      <span className="memory-face-type">
                        {memoryVariant === "word" ? (card.type === "char" ? "Letter" : "Word") : "Letter"}
                      </span>
                      <span className="memory-face-value">{card.value}</span>
                    </span>
                  ) : "?"}
                </button>
              );
            })}
          </div>
          </>
        )}

        {mode === "quiz" && (
          <div className="quiz-panel">
            <h3>{quizFinished ? "Quiz Complete" : `Question ${quizIndex + 1} of ${quizQuestions.length}`}</h3>
            {!quizFinished && (
              <div className="quiz-meta-row">
                <span className="quiz-meta-pill">Score: {quizScore}</span>
                <span className="quiz-meta-pill">Correct: {quizCorrectCount}/{quizQuestions.length}</span>
                <span className="quiz-meta-pill">Streak: {quizStreak}</span>
                <span className="quiz-meta-pill">Time: {quizTimeLeft}s</span>
              </div>
            )}
            {!quizFinished && (
              <div className="quiz-progress-track" aria-hidden="true">
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${Math.round(((quizIndex + (quizFeedback ? 1 : 0)) / quizQuestions.length) * 100)}%` }}
                />
              </div>
            )}
            {!quizFinished && quizQuestions[quizIndex]?.promptLabel && (
              <span className="quiz-type-badge">{quizQuestions[quizIndex].promptLabel}</span>
            )}
            {!quizFinished && quizQuestions[quizIndex]?.promptImage && (
              <div className="quiz-image-frame">
                <img src={quizQuestions[quizIndex].promptImage} alt="Quiz prompt visual" className="quiz-image" />
              </div>
            )}
            <p>{quizFinished ? `Final score: ${quizScore}` : quizQuestions[quizIndex].q}</p>
            {!quizFinished && (
              <div className="quiz-choice-grid">
                {quizQuestions[quizIndex].choices.map((choice, idx) => (
                  <button
                    key={choice}
                    type="button"
                    className={`quiz-choice ${
                      quizFeedback
                        ? choice === quizQuestions[quizIndex].correct
                          ? "correct"
                          : choice === quizFeedback.choice
                            ? "wrong"
                            : "locked"
                        : ""
                    }`}
                    onClick={() => answerQuiz(choice)}
                    disabled={Boolean(quizFeedback)}
                  >
                    <span className="quiz-choice-key">{idx + 1}</span>
                    {choice}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="status-message">{message}</div>

        {((isCompleted && (mode === "drag" || mode === "drag-timed")) || gameOver || allMemoryMatched || quizFinished) && (
          <div className="success">
            {isCompleted || allMemoryMatched || quizFinished ? "🎉 Great Job!" : "⏱ Time is up!"}
            <button onClick={handleReset}>Play Again</button>
          </div>
        )}

        <div className="leaderboard">
          <h3>Local Leaderboard</h3>
          {leaderboard.length === 0 ? (
            <p className="leaderboard-empty">No scores yet. Finish a challenge to create the first record.</p>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((entry, idx) => (
                <div key={entry.id} className="leaderboard-item">
                  <strong>#{idx + 1}</strong>
                  <span>{entry.mode}</span>
                  <span>{entry.score} pts</span>
                  <span>{entry.accuracy}%</span>
                  <span>{entry.duration == null ? "-" : `${entry.duration}s`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </DndProvider>
  );
};

export default DragGame;