(function(){
  "use strict";

  // ---------- Chart definition (24 bars, 8 steps/bar, 8th-note resolution) ----------
  const BPM = 100;
  const BEAT = 60 / BPM;      // 0.6s per quarter note
  const STEP = BEAT / 2;      // 0.3s per 8th note
  const LEAD_IN = 4 * BEAT;   // 4-beat count-in before first note

  const PATTERNS = [
    // Section 1 — intro, quarter notes only
    "0...2...", "1...3...", "0...2...", "2...0...",
    // Section 2 — steady 8th-note flow
    "0.1.2.3.", "1.2.3.0.", "2.3.0.1.", "3.0.1.2.",
    // Section 3 — syncopation
    "0..12.3.", "1..23.0.", "2..30.1.", "3..01.2.",
    // Section 4 — climax, dense
    "0123.023", "1230.130", "2301.201", "3012.312",
    // Section 5 — cool down
    "0.2.1.3.", "1.3.2.0.", "0.1.3.2.", "2.0.3.1.",
    // Section 6 — outro
    "0...2...", "1...3...", "0.2.1...", "0......."
  ];

  const chart = [];
  PATTERNS.forEach((bar, b) => {
    for (let s = 0; s < 8; s++){
      const ch = bar[s];
      if (ch === "." || ch === undefined) continue;
      chart.push({ lane: parseInt(ch, 10), hitTime: LEAD_IN + (b * 8 + s) * STEP });
    }
  });
  const LAST_HIT = chart[chart.length - 1].hitTime;
  const TOTAL_DURATION = LAST_HIT + 1.4;

  // ---------- Timing windows ----------
  const NOTE_TRAVEL = 1.7;
  const PERFECT_WINDOW = 0.07;
  const GOOD_WINDOW = 0.16;

  const LANE_FREQS = [523.25, 659.25, 783.99, 987.77]; // C5 E5 G5 B5
  // Mapped by physical key position (e.code), so IME/입력기 상태나 키보드 언어 설정과
  // 무관하게 항상 Q W E R 물리 키가 올바르게 인식된다.
  const KEY_LANE_MAP = { KeyQ: 0, KeyW: 1, KeyE: 2, KeyR: 3 };

  // ---------- DOM refs ----------
  const stage = document.getElementById("stage");
  const laneEls = [0,1,2,3].map(i => stage.querySelector('.lane[data-lane="' + i + '"]'));
  const pressEls = [0,1,2,3].map(i => document.getElementById("press" + i));
  const keycapEls = [0,1,2,3].map(i => document.querySelector('.keycap[data-lane="' + i + '"]'));
  const judgmentPopup = document.getElementById("judgmentPopup");
  const prepareEl = document.getElementById("prepare");
  const startOverlay = document.getElementById("startOverlay");
  const resultOverlay = document.getElementById("resultOverlay");
  const startBtn = document.getElementById("startBtn");
  const retryBtn = document.getElementById("retryBtn");
  const titleBtn = document.getElementById("titleBtn");
  const rankStamp = document.getElementById("rankStamp");
  const resultGrid = document.getElementById("resultGrid");

  const scoreVal = document.getElementById("scoreVal");
  const comboVal = document.getElementById("comboVal");
  const multVal = document.getElementById("multVal");
  const progressFill = document.getElementById("progressFill");

  // ---------- Game state ----------
  let state = "start"; // start | playing | result
  let audioCtx = null;
  let masterGain = null;
  let startTime = 0;
  let notes = [];
  let score = 0, combo = 0, maxCombo = 0;
  let perfectCount = 0, goodCount = 0, missCount = 0;

  function getMultiplier(){
    const tier = Math.min(3, Math.floor(combo / 20));
    return 1 + tier * 0.5;
  }

  function updateHUD(){
    scoreVal.textContent = String(score).padStart(6, "0");
    comboVal.firstChild.textContent = String(combo);
    multVal.textContent = "×" + getMultiplier().toFixed(1);
  }

  // ---------- Audio ----------
  function ensureAudio(){
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
  }

  function scheduleClick(time, accent){
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = accent ? 880 : 600;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.22 : 0.14, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  function scheduleMetronome(){
    const totalBeats = Math.ceil(TOTAL_DURATION / BEAT) + 1;
    for (let i = 0; i < totalBeats; i++){
      scheduleClick(startTime + i * BEAT, i % 4 === 0);
    }
  }

  function playHit(lane, perfect){
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = LANE_FREQS[lane];
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(perfect ? 0.28 : 0.18, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (perfect ? 0.22 : 0.16));
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // ---------- Note lifecycle ----------
  function buildNotes(){
    laneEls.forEach(l => {
      l.querySelectorAll(".note").forEach(n => n.remove());
    });
    notes = chart.map(c => {
      const el = document.createElement("div");
      el.className = "note";
      el.style.setProperty("--note-y", "0px");
      laneEls[c.lane].appendChild(el);
      return { lane: c.lane, hitTime: c.hitTime, el, resolved: false };
    });
  }

  function resolveNote(note, judgment){
    note.resolved = true;
    if (judgment === "perfect"){
      combo++; perfectCount++;
      score += Math.round(300 * getMultiplier());
      playHit(note.lane, true);
    } else if (judgment === "good"){
      combo++; goodCount++;
      score += Math.round(100 * getMultiplier());
      playHit(note.lane, false);
    } else {
      combo = 0; missCount++;
    }
    maxCombo = Math.max(maxCombo, combo);
    updateHUD();
    showJudgment(judgment);
    note.el.classList.add("resolved");
    setTimeout(() => { if (note.el.parentNode) note.el.parentNode.removeChild(note.el); }, 240);
  }

  function showJudgment(judgment){
    judgmentPopup.className = "judgment-popup " + judgment;
    judgmentPopup.textContent = judgment === "perfect" ? "PERFECT" : judgment === "good" ? "GOOD" : "MISS";
    // restart animation
    void judgmentPopup.offsetWidth;
    judgmentPopup.classList.add("show");
  }

  function flashKeycap(lane){
    const cap = keycapEls[lane];
    cap.classList.add("active");
    setTimeout(() => cap.classList.remove("active"), 110);
    const press = pressEls[lane];
    press.classList.remove("flash");
    void press.offsetWidth;
    press.classList.add("flash");
  }

  function handleHit(lane){
    const songTime = audioCtx.currentTime - startTime;
    let best = null, bestDiff = Infinity;
    for (const n of notes){
      if (n.lane !== lane || n.resolved) continue;
      const diff = Math.abs(n.hitTime - songTime);
      if (diff <= GOOD_WINDOW && diff < bestDiff){ bestDiff = diff; best = n; }
    }
    if (!best) return; // no matching note nearby: ignored, no penalty
    resolveNote(best, bestDiff <= PERFECT_WINDOW ? "perfect" : "good");
  }

  // ---------- Render loop ----------
  function animate(){
    if (state === "playing"){
      const songTime = audioCtx.currentTime - startTime;
      const laneHeight = laneEls[0].clientHeight;
      const judgeY = laneHeight * 0.86;

      for (const n of notes){
        if (n.resolved) continue;
        const timeToHit = n.hitTime - songTime;
        if (timeToHit > NOTE_TRAVEL){
          n.el.style.opacity = "0";
          continue;
        }
        if (timeToHit < -GOOD_WINDOW){
          resolveNote(n, "miss");
          continue;
        }
        const progress = 1 - (timeToHit / NOTE_TRAVEL);
        const y = progress * judgeY;
        n.el.style.opacity = "1";
        n.el.style.transform = "translateY(" + y + "px)";
        n.el.style.setProperty("--note-y", y + "px");
      }

      progressFill.style.width = Math.min(100, (songTime / TOTAL_DURATION) * 100) + "%";

      if (songTime > TOTAL_DURATION && notes.every(n => n.resolved)){
        endGame();
      }
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // ---------- Game flow ----------
  function startGame(){
    ensureAudio();
    if (audioCtx.state === "suspended") audioCtx.resume();

    score = 0; combo = 0; maxCombo = 0;
    perfectCount = 0; goodCount = 0; missCount = 0;
    updateHUD();
    progressFill.style.width = "0%";

    buildNotes();
    startTime = audioCtx.currentTime + 0.2;
    scheduleMetronome();

    startOverlay.classList.add("hidden");
    resultOverlay.classList.add("hidden");

    prepareEl.classList.remove("show");
    void prepareEl.offsetWidth;
    prepareEl.classList.add("show");

    state = "playing";
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }

  function endGame(){
    state = "result";
    try {
      const totalNotes = chart.length;
      const acc = totalNotes ? ((perfectCount + goodCount * 0.5) / totalNotes) * 100 : 0;

      if (resultGrid){
        resultGrid.innerHTML =
          "<span>Score</span><b>" + escapeHtml(String(score).padStart(6, "0")) + "</b>" +
          "<span>Max Combo</span><b>" + escapeHtml(maxCombo) + "</b>" +
          "<span>Accuracy</span><b>" + escapeHtml(acc.toFixed(1)) + "%</b>" +
          "<span>Perfect / Good / Miss</span><b>" + escapeHtml(perfectCount + " / " + goodCount + " / " + missCount) + "</b>";
      }

      let rank = "C", cls = "c";
      if (acc >= 95){ rank = "S"; cls = "s"; }
      else if (acc >= 85){ rank = "A"; cls = "a"; }
      else if (acc >= 70){ rank = "B"; cls = "b"; }
      if (rankStamp){ rankStamp.textContent = rank; rankStamp.className = "stamp " + cls; }
    } finally {
      resultOverlay.classList.remove("hidden");
    }
  }

  function showStart(){
    state = "start";
    resultOverlay.classList.add("hidden");
    startOverlay.classList.remove("hidden");
  }

  startBtn.addEventListener("click", startGame);
  retryBtn.addEventListener("click", startGame);
  titleBtn.addEventListener("click", showStart);

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const lane = KEY_LANE_MAP[e.code];
    if (lane === undefined){
      if ((e.code === "Space" || e.code === "Enter") && state === "start"){ e.preventDefault(); startGame(); }
      return;
    }
    e.preventDefault();
    flashKeycap(lane);
    if (state !== "playing") return;
    handleHit(lane);
  });
})();
