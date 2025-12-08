// js/uiMenus.js

document.addEventListener('DOMContentLoaded', () => {
  // Screens
  const homeCard = document.getElementById('homeCard');
  const howToCard = document.getElementById('howToCard');
  const addPlayersCard = document.getElementById('addPlayersCard');
  const viewQuestionsCard = document.getElementById('viewQuestionsCard');
  const addQuestionsCard = document.getElementById('addQuestionsCard');
  const gameCard = document.getElementById('gameCard');
  const revealCard = document.getElementById('revealCard');
  const guessCard = document.getElementById('guessCard');
  const gameOverCard = document.getElementById('gameOverCard');

  function showScreen(card) {
    [
      homeCard, howToCard, addPlayersCard,
      viewQuestionsCard, addQuestionsCard,
      gameCard, revealCard, guessCard, gameOverCard
    ].forEach(c => { if (c) c.style.display = 'none'; });
    if (card) card.style.display = 'block';
  }

  // Elements
  const darkModeBtn = document.getElementById('darkModeBtn');
  const levelSelect = document.getElementById('levelSelect');
  const levelDescription = document.getElementById('levelDescription');
  const modeLabel = document.getElementById('modeLabel');
  const statusEl = document.getElementById('status');
  const namesInput = document.getElementById('namesInput');
  const playersSaved = document.getElementById('playersSaved');
  const playerDisplay = document.getElementById('playerDisplay');
  const questionDisplay = document.getElementById('questionDisplay');

  const questionsList = document.getElementById('questionsList');
  const newQuestionInput = document.getElementById('newQuestionInput');
  const addQuestionStatus = document.getElementById('addQuestionStatus');
  const finalHistory = document.getElementById('finalHistory');
  const customQuestionsList = document.getElementById('customQuestionsList');

  const wheelCanvas = document.getElementById('wheelCanvas');
  const wheelCtx = wheelCanvas.getContext('2d');
  let wheelAngle = 0;
  let wheelSpinning = false;

  const revealCountdownEl = document.getElementById('revealCountdown');
  const revealQuestionText = document.getElementById('revealQuestionText');
  let revealTimer = null;

  const guessOptionsContainer = document.getElementById('guessOptionsContainer');
  const guessResultEl = document.getElementById('guessResult');

  const LEVEL_DESCRIPTIONS = {
    1: "SFW only. Soft, safe questions for civilised humans.",
    2: "SFW + mild spice. Questions your mum could probably cope with (just about).",
    3: "Dark, messy, chaotic energy. Not for sensitive souls.",
    4: "Maximum unhinged mode. Absolutely not work safe, friendship safe, or soul safe."
  };

  // --- DARK MODE ---
  if (darkModeBtn) {
    darkModeBtn.addEventListener('click', () => {
      const on = !document.body.classList.contains('dark');
      if (on) document.body.classList.add('dark');
      else document.body.classList.remove('dark');
      darkModeBtn.textContent = on ? "🌙 Dark: On" : "🌙 Dark: Off";
      localStorage.setItem('ml_darkMode', on ? '1' : '0');
    });
    const savedDark = localStorage.getItem('ml_darkMode') === '1';
    if (savedDark) {
      document.body.classList.add('dark');
      darkModeBtn.textContent = "🌙 Dark: On";
    }
  }

  // --- LEVEL SELECTION ---
  function applyLevelFromSelect() {
    const lvl = parseInt(levelSelect.value, 10) || 2;
    localStorage.setItem('ml_level', String(lvl));
    const info = GameCore.setLevel(lvl);
    modeLabel.textContent = "Mode: " + levelSelect.options[levelSelect.selectedIndex].text;
    levelDescription.textContent = LEVEL_DESCRIPTIONS[lvl] || "";
    statusEl.textContent = info.totalQuestions + " questions available. Spin to start!";
  }

  // Initialise level from saved value
  const savedLevelStr = localStorage.getItem('ml_level');
  if (savedLevelStr && levelSelect.querySelector(`option[value="${savedLevelStr}"]`)) {
    levelSelect.value = savedLevelStr;
  }
  levelSelect.addEventListener('change', applyLevelFromSelect);
  applyLevelFromSelect();

  // --- WHEEL DRAWING ---
  function drawWheel() {
    const players = GameCore.getPlayers();
    const canvas = wheelCanvas;
    const ctx = wheelCtx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!players.length) return;

    const radius = canvas.width / 2 - 8;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const segmentAngle = 2 * Math.PI / players.length;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(wheelAngle);

    for (let i = 0; i < players.length; i++) {
      const startAngle = i * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = (i % 2 === 0) ? "#f97316" : "#22c55e";
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = "#111827";
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.font = "13px system-ui";
      ctx.fillText(players[i], radius - 10, 4);
      ctx.restore();
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111827";
    ctx.fill();
    ctx.stroke();
  }

  // --- WHEEL SPIN ---
  function spinWheel() {
    const players = GameCore.getPlayers();
    if (!players.length) {
      alert("Add players first.");
      return;
    }
    if (wheelSpinning) return;

    const pick = GameCore.pickJudgeIndex(); // chooses index with no-repeat logic
    const chosenIndex = pick.index;

    const segmentAngle = 2 * Math.PI / players.length;
    const extraTurns = 4 + Math.random() * 2;
    const baseTargetAngle = -Math.PI / 2 - (chosenIndex + 0.5) * segmentAngle;
    const targetAngle = baseTargetAngle + extraTurns * 2 * Math.PI;

    wheelSpinning = true;
    const startAngle = wheelAngle;
    const duration = 2500 + Math.random() * 1000;
    const startTime = performance.now();

    playerDisplay.textContent = "Spinning…";
    questionDisplay.textContent = "";
    questionDisplay.classList.add('blurred');

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);

      wheelAngle = startAngle + (targetAngle - startAngle) * eased;
      drawWheel();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        wheelSpinning = false;
        const info = GameCore.setJudge(chosenIndex);
        playerDisplay.textContent = info.name;

        const turnStatus = GameCore.getTurnStatus();
        statusEl.textContent =
          turnStatus.remainingInDeck + " questions available. This turn: " +
          turnStatus.usedThisTurn + "/" + turnStatus.maxPerTurn;

        if (navigator.vibrate) {
          navigator.vibrate(120);
        }
      }
    }

    requestAnimationFrame(animate);
  }

  // --- NAV BUTTONS ---

  document.getElementById('startGameBtn').addEventListener('click', () => {
    showScreen(addPlayersCard);
  });

  document.getElementById('howToBtn').addEventListener('click', () => {
    showScreen(howToCard);
  });

  document.getElementById('howToBackBtn').addEventListener('click', () => {
    showScreen(homeCard);
  });

  document.getElementById('addPlayersBackBtn').addEventListener('click', () => {
    showScreen(homeCard);
  });

  document.getElementById('viewQuestionsBackBtn').addEventListener('click', () => {
    showScreen(homeCard);
  });

  document.getElementById('addQuestionsBackBtn').addEventListener('click', () => {
    showScreen(homeCard);
  });

  // View questions
  document.getElementById('showQuestionsBtn').addEventListener('click', () => {
    renderQuestionsList();
    showScreen(viewQuestionsCard);
  });

  document.getElementById('addQuestionsBtn').addEventListener('click', () => {
    addQuestionStatus.textContent = "";
    newQuestionInput.value = "";
    showScreen(addQuestionsCard);
  });

  // --- PLAYERS ---

  document.getElementById('savePlayersBtn').addEventListener('click', () => {
    const raw = namesInput.value;
    const list = raw.split(',').map(n => n.trim()).filter(Boolean);
    if (!list.length) {
      alert("Add at least one player.");
      return;
    }
    GameCore.setPlayers(list);
    playersSaved.textContent = "Players: " + list.join(', ');
    drawWheel();
  });

  document.getElementById('continueToWheelBtn').addEventListener('click', () => {
    const players = GameCore.getPlayers();
    if (!players.length) {
      // try saving from input
      const raw = namesInput.value;
      const list = raw.split(',').map(n => n.trim()).filter(Boolean);
      if (!list.length) {
        alert("Add at least one player.");
        return;
      }
      GameCore.setPlayers(list);
      playersSaved.textContent = "Players: " + list.join(', ');
    }
    drawWheel();
    showScreen(gameCard);

    const counts = GameCore.getQuestionPoolCounts();
    statusEl.textContent =
      counts.remaining + " questions available. Spin to start!";
  });

  // --- QUESTIONS & TURN LIMIT ---

  document.getElementById('spinBtn').addEventListener('click', spinWheel);

  document.getElementById('getQuestionBtn').addEventListener('click', () => {
    try {
      const res = GameCore.drawQuestion();
      if (res && res.error === 'max_turn_questions') {
        alert("No more re-rolls this turn! You must answer the last question.");
        return;
      }
      if (res && res.error === 'no_questions_left') {
        questionDisplay.textContent = "No questions left in the deck.";
        return;
      }
      questionDisplay.textContent = res.decoratedText;
      questionDisplay.classList.add('blurred');

      const ts = GameCore.getTurnStatus();
      statusEl.textContent =
        ts.remainingInDeck + " questions left in deck. This turn: " +
        ts.usedThisTurn + "/" + ts.maxPerTurn;
    } catch (e) {
      alert("Spin to choose a judge first.");
    }
  });

  // Hold-to-reveal
  const peekButton = document.getElementById('peekButton');
  const startEvents = ['mousedown', 'touchstart'];
  const endEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];

  startEvents.forEach(ev => {
    peekButton.addEventListener(ev, e => {
      e.preventDefault();
      questionDisplay.classList.remove('blurred');
    });
  });
  endEvents.forEach(ev => {
    peekButton.addEventListener(ev, e => {
      e.preventDefault();
      if (questionDisplay.textContent.trim()) {
        questionDisplay.classList.add('blurred');
      }
    });
  });

  // --- ADD CUSTOM QUESTION ---

  document.getElementById('addQuestionConfirmBtn').addEventListener('click', () => {
    const text = newQuestionInput.value.trim();
    if (!text) {
      alert("Type a question first.");
      return;
    }
    const ok = GameCore.addCustomQuestion(text);
    if (ok) {
      newQuestionInput.value = "";
      addQuestionStatus.textContent = "Added! This question is now in the deck for this device.";
      const counts = GameCore.getQuestionPoolCounts();
      statusEl.textContent =
        counts.remaining + " questions available. Spin to start!";
    }
  });

  document.getElementById('clearCustomQuestionsBtn').addEventListener('click', () => {
    if (!confirm("Clear ALL custom questions from this device?")) return;
    GameCore.clearCustomQuestionsCore();
    addQuestionStatus.textContent = "Custom questions cleared from this device.";
  });

  // --- VIEW QUESTIONS LIST ---

  function renderQuestionsList() {
    const level = GameCore.getCurrentLevel();
    const base = (window.LEVEL_QUESTIONS && window.LEVEL_QUESTIONS[level]) || [];
    const custom = GameCore.getCustomQuestions();

    if (!base.length && !custom.length) {
      questionsList.innerHTML = "<p class='subtext'>No questions.</p>";
      return;
    }

    let html = "";
    html += "<h4>Base questions (Level " + level + ")</h4>";
    if (!base.length) {
      html += "<p class='subtext'>None.</p>";
    } else {
      html += "<ol>";
      base.forEach(q => { html += "<li>" + q + "</li>"; });
      html += "</ol>";
    }

    html += "<h4>Custom questions (this device)</h4>";
    if (!custom.length) {
      html += "<p class='subtext'>None yet.</p>";
    } else {
      html += "<ol>";
      custom.forEach(q => { html += "<li>" + q + "</li>"; });
      html += "</ol>";
    }

    questionsList.innerHTML = html;
  }

  // --- REVEAL MODE ---

  function clearRevealTimer() {
    if (revealTimer) {
      clearInterval(revealTimer);
      revealTimer = null;
    }
  }

  function showRevealScreen() {
    const q = GameCore.getCurrentQuestion();
    if (!q) {
      alert("You need a question first.");
      return;
    }
    showScreen(revealCard);
    revealQuestionText.textContent = q;

    clearRevealTimer();
    let remaining = 5;
    revealCountdownEl.textContent = "Revealing in " + remaining + "…";

    revealTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        revealCountdownEl.textContent = "Revealing in " + remaining + "…";
      } else {
        revealCountdownEl.textContent = "🔥 GO!";
        clearRevealTimer();
      }
    }, 1000);
  }

  document.getElementById('revealModeBtn').addEventListener('click', showRevealScreen);
  document.getElementById('revealBackBtn').addEventListener('click', () => {
    clearRevealTimer();
    showScreen(gameCard);
  });

  // --- GUESS MODE ---

  document.getElementById('guessModeBtn').addEventListener('click', () => {
    const res = GameCore.startGuessMode();
    if (res && res.error === 'no_current_question') {
      alert("You need a question first.");
      return;
    }
    guessOptionsContainer.innerHTML = "";
    guessResultEl.textContent = "";
    res.options.forEach((q, index) => {
      const btn = document.createElement('button');
      btn.className = "secondary-btn";
      btn.textContent = q;
      btn.addEventListener('click', () => handleGuessClick(index, btn));
      guessOptionsContainer.appendChild(btn);
    });
    showScreen(guessCard);
  });

  function handleGuessClick(index, btnEl) {
    const res = GameCore.makeGuess(index);
    const buttons = guessOptionsContainer.querySelectorAll('button');

    if (res.locked && !res.correct && res.attemptsLeft === undefined) {
      alert("No more guesses this round!");
      return;
    }

    if (res.correct) {
      btnEl.classList.add('guess-correct');
      guessResultEl.textContent = "✅ Correct! You guessed the question.";
      buttons.forEach(b => b.disabled = true);
      return;
    } else {
      btnEl.classList.add('guess-wrong');
      if (res.attemptsLeft > 0) {
        guessResultEl.textContent = "❌ Nope! Try one more time.";
      } else {
        guessResultEl.textContent = "❌ No more guesses. The real question stays secret.";
        buttons.forEach(b => b.disabled = true);
      }
    }
  }

  document.getElementById('guessBackBtn').addEventListener('click', () => {
    showScreen(gameCard);
  });

  // --- END GAME / NEW GAME ---

  document.getElementById('endGameBtn').addEventListener('click', () => {
    if (!confirm("End game and show final history?")) return;

    const summary = GameCore.getHistorySummary();
    if (!summary.length) {
      finalHistory.innerHTML = "<p class='subtext'>No rounds played.</p>";
    } else {
      let html = "<table><tr><th>#</th><th>Player</th><th>Final question</th></tr>";
      summary.forEach(row => {
        html += "<tr><td>" + row.round + "</td><td>" +
                row.player + "</td><td>" + row.question + "</td></tr>";
      });
      html += "</table>";
      finalHistory.innerHTML = html;
    }

    const custom = GameCore.getCustomQuestions();
    if (!custom.length) {
      customQuestionsList.innerHTML =
        "<p class='subtext'>No custom questions stored on this device.</p>";
    } else {
      let html = "<ol>";
      custom.forEach(q => { html += "<li>" + q + "</li>"; });
      html += "</ol>";
      customQuestionsList.innerHTML = html;
    }

    showScreen(gameOverCard);
  });

  document.getElementById('newGameBtn').addEventListener('click', () => {
    GameCore.resetGameState(true);
    namesInput.value = "";
    playersSaved.textContent = "";
    playerDisplay.textContent = "";
    questionDisplay.textContent = "";
    questionDisplay.classList.add('blurred');
    const counts = GameCore.getQuestionPoolCounts();
    statusEl.textContent =
      counts.remaining + " questions available. Spin to start!";
    showScreen(homeCard);
    wheelAngle = 0;
    drawWheel();
  });

  // --- INITIAL DRAW ---
  drawWheel();
  showScreen(homeCard);
});
