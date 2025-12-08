// js/gameCore.js
// Pure game state & rules – no direct DOM.

(function () {
  const MAX_QUESTIONS_PER_TURN = 3;

  let currentLevel = 2;
  let baseQuestions = [];
  let customQuestions = [];

  let players = [];
  let remainingQuestions = [];

  let currentPlayerIndex = null;
  let lastPlayerWithQuestion = null;

  let history = [];
  let currentTurnId = 0;
  let currentTurnQuestionCount = 0;
  let currentQuestionText = null;

  let guessOptions = [];
  let correctGuessIndex = null;
  let guessAttempts = 0;

  // --- Custom question storage ---
  function loadCustomQuestions() {
    try {
      const saved = localStorage.getItem('ml_customQuestions_v1');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) customQuestions = parsed;
    } catch (e) {
      customQuestions = [];
    }
  }

  function saveCustomQuestions() {
    try {
      localStorage.setItem('ml_customQuestions_v1', JSON.stringify(customQuestions));
    } catch (e) {}
  }

  // --- Level & questions ---
  function setLevel(level) {
    currentLevel = level;
    if (window.LEVEL_QUESTIONS && Array.isArray(window.LEVEL_QUESTIONS[level])) {
      baseQuestions = window.LEVEL_QUESTIONS[level];
    } else {
      baseQuestions = [];
    }
    remainingQuestions = [...baseQuestions, ...customQuestions];
    currentTurnQuestionCount = 0;
    currentQuestionText = null;
    guessOptions = [];
    guessAttempts = 0;
    return {
      level,
      totalQuestions: remainingQuestions.length
    };
  }

  function getCurrentLevel() {
    return currentLevel;
  }

  function getQuestionPoolCounts() {
    return {
      base: baseQuestions.length,
      custom: customQuestions.length,
      remaining: remainingQuestions.length
    };
  }

  // --- Players & turns ---
  function setPlayers(list) {
    players = list.slice();
    currentPlayerIndex = null;
    lastPlayerWithQuestion = null;
    currentTurnId = 0;
    currentTurnQuestionCount = 0;
    history = [];
    return players;
  }

  function getPlayers() {
    return players.slice();
  }

  // pick judge index without committing (for wheel animation)
  function pickJudgeIndex() {
    if (players.length === 0) {
      throw new Error("No players set");
    }
    let indices = players.map((_, i) => i);
    if (players.length > 1 && lastPlayerWithQuestion !== null) {
      indices = indices.filter(i => i !== lastPlayerWithQuestion);
    }
    const chosenIndex = indices[Math.floor(Math.random() * indices.length)];
    return {
      index: chosenIndex,
      name: players[chosenIndex]
    };
  }

  // commit chosen judge after wheel finishes
  function setJudge(index) {
    if (index < 0 || index >= players.length) {
      throw new Error("Invalid judge index");
    }
    currentPlayerIndex = index;
    lastPlayerWithQuestion = index;
    currentTurnId += 1;
    currentTurnQuestionCount = 0;
    currentQuestionText = null;
    guessOptions = [];
    guessAttempts = 0;
    return {
      index,
      name: players[index],
      turnId: currentTurnId
    };
  }

  function drawQuestion() {
    if (currentPlayerIndex === null) {
      throw new Error("No current player – spin first");
    }
    if (currentTurnQuestionCount >= MAX_QUESTIONS_PER_TURN) {
      return { error: "max_turn_questions" };
    }
    if (remainingQuestions.length === 0) {
      return { error: "no_questions_left" };
    }

    const idx = Math.floor(Math.random() * remainingQuestions.length);
    const q = remainingQuestions.splice(idx, 1)[0];
    currentTurnQuestionCount += 1;
    currentQuestionText = q;
    guessOptions = [];
    guessAttempts = 0;

    history.push({
      player: players[currentPlayerIndex],
      question: q,
      turnId: currentTurnId,
      roll: currentTurnQuestionCount
    });

    const rollsLeft = MAX_QUESTIONS_PER_TURN - currentTurnQuestionCount;
    let prefix;
    if (currentTurnQuestionCount === 1) prefix = "First question:";
    else if (currentTurnQuestionCount === 2) prefix = "Second question (1 re-roll used):";
    else prefix = "FINAL question (no more re-rolls):";

    return {
      text: q,
      decoratedText: prefix + "\n\n" + q,
      usedThisTurn: currentTurnQuestionCount,
      rollsLeft,
      remainingInDeck: remainingQuestions.length
    };
  }

  function getCurrentQuestion() {
    return currentQuestionText;
  }

  function getTurnStatus() {
    return {
      maxPerTurn: MAX_QUESTIONS_PER_TURN,
      usedThisTurn: currentTurnQuestionCount,
      remainingInDeck: remainingQuestions.length,
      hasPlayer: currentPlayerIndex !== null
    };
  }

  // Custom questions
  function addCustomQuestion(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return false;
    customQuestions.push(trimmed);
    saveCustomQuestions();
    remainingQuestions.push(trimmed);
    return true;
  }

  function clearCustomQuestionsCore() {
    customQuestions = [];
    saveCustomQuestions();
    remainingQuestions = [...baseQuestions];
  }

  function getCustomQuestions() {
    return customQuestions.slice();
  }

  // Guess mode
  function startGuessMode() {
    if (!currentQuestionText) {
      return { error: "no_current_question" };
    }
    const correct = currentQuestionText;
    const all = [...baseQuestions, ...customQuestions].filter(q => q !== correct);
    const distractors = [];
    const maxDistractors = Math.min(4, all.length);
    const pool = [...all];
    for (let i = 0; i < maxDistractors; i++) {
      if (!pool.length) break;
      const idx = Math.floor(Math.random() * pool.length);
      distractors.push(pool.splice(idx, 1)[0]);
    }
    guessOptions = [correct, ...distractors];
    for (let i = guessOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [guessOptions[i], guessOptions[j]] = [guessOptions[j], guessOptions[i]];
    }
    correctGuessIndex = guessOptions.indexOf(correct);
    guessAttempts = 0;
    return {
      options: guessOptions.slice(),
      attemptsLeft: 2
    };
  }

  function makeGuess(index) {
    if (!guessOptions.length) {
      return { error: "guess_not_started" };
    }
    if (guessAttempts >= 2) {
      return { locked: true };
    }
    const correct = (index === correctGuessIndex);
    guessAttempts++;
    return {
      correct,
      attemptsLeft: Math.max(0, 2 - guessAttempts),
      locked: guessAttempts >= 2 || correct
    };
  }

  function getHistorySummary() {
    const finalByTurn = {};
    history.forEach(h => {
      finalByTurn[h.turnId] = h;
    });
    const turnIds = Object.keys(finalByTurn).map(Number).sort((a, b) => a - b);
    return turnIds.map((tid, i) => {
      const h = finalByTurn[tid];
      return {
        round: i + 1,
        player: h.player,
        question: h.question
      };
    });
  }

  function resetGameState(keepLevel) {
    if (!keepLevel) currentLevel = 2;
    setLevel(currentLevel);
    players = [];
    remainingQuestions = [...baseQuestions, ...customQuestions];
    currentPlayerIndex = null;
    lastPlayerWithQuestion = null;
    history = [];
    currentTurnId = 0;
    currentTurnQuestionCount = 0;
    currentQuestionText = null;
    guessOptions = [];
    guessAttempts = 0;
  }

  // Init
  loadCustomQuestions();
  if (window.LEVEL_QUESTIONS && Array.isArray(window.LEVEL_QUESTIONS[2])) {
    setLevel(2);
  }

  window.GameCore = {
    setLevel,
    getCurrentLevel,
    getQuestionPoolCounts,
    setPlayers,
    getPlayers,
    pickJudgeIndex,
    setJudge,
    drawQuestion,
    getCurrentQuestion,
    getTurnStatus,
    addCustomQuestion,
    clearCustomQuestionsCore,
    getCustomQuestions,
    startGuessMode,
    makeGuess,
    getHistorySummary,
    resetGameState
  };
})();
