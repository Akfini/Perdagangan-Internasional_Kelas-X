/**
 * TRADE QUEST: Misi Menjelajahi Dunia Perdagangan
 * Logika Utama JavaScript Murni (Vanilla JS)
 * Fitur: SPA Routing, State & LocalStorage, Web Audio API,
 * 3 Modul + Mini Quiz, Trade Lab (4 Skenario Simulasi),
 * 4 Challenge Games, Final Mission (15 Soal + Pembahasan),
 * Sistem Gamifikasi (Level, XP, 10 Badges).
 */

// ==========================================================================
// 1. STATE & STORAGE MANAGEMENT
// ==========================================================================
const STORAGE_KEY = 'trade_quest_data_v1';

const defaultState = {
  xp: 0,
  level: 1,
  completedActivities: [], // Menyimpan ID aktivitas agar XP tidak diduplikasi
  unlockedBadges: [],
  modulesDone: {
    mod1: false,
    mod2: false,
    mod3: false
  },
  labDone: {
    scen1: false,
    scen2: false,
    scen3: false,
    scen4: false
  },
  gamesPlayed: {
    tebak: false,
    match: false,
    tf: false,
    mystery: false
  },
  mysteryBoxesOpened: [false, false, false, false, false, false],
  finalExamScore: null,
  soundEnabled: true
};

let appState = { ...defaultState };

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      appState = Object.assign({}, defaultState, JSON.parse(saved));
    }
  } catch (err) {
    console.error('Gagal memuat state dari localStorage', err);
    appState = { ...defaultState };
  }
  updateUI();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.error('Gagal menyimpan state ke localStorage', err);
  }
}

function resetAllProgress() {
  appState = JSON.parse(JSON.stringify(defaultState));
  saveState();
  updateUI();
  closeModal('resetModal');
  showToast('Seluruh progres belajar berhasil direset!', '🔄');
  navigateTo('home');
}

// Tambah XP dengan proteksi anti-exploit
function awardXP(amount, activityId, activityName) {
  if (activityId && appState.completedActivities.includes(activityId)) {
    // Sudah pernah diklaim sebelumnya
    return false;
  }

  if (activityId) {
    appState.completedActivities.push(activityId);
  }

  appState.xp += amount;
  playSound('correct');
  showToast(`+${amount} XP: ${activityName || 'Aktivitas Selesai'}!`, '⭐');

  checkLevelUp();
  checkBadges();
  saveState();
  updateUI();
  return true;
}

// Level Ranks (5 Peringkat)
const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Calon Pedagang', minXP: 0, maxXP: 250, emblem: '🌱' },
  { level: 2, name: 'Nahkoda Niaga', minXP: 251, maxXP: 600, emblem: '⚓' },
  { level: 3, name: 'Atase Perdagangan', minXP: 601, maxXP: 1050, emblem: '📜' },
  { level: 4, name: 'Diplomat Ekonomi', minXP: 1051, maxXP: 1500, emblem: '🌐' },
  { level: 5, name: 'Sang Menteri Perdagangan', minXP: 1501, maxXP: 999999, emblem: '👑' }
];

function checkLevelUp() {
  let currentLvl = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (appState.xp >= LEVEL_THRESHOLDS[i].minXP) {
      currentLvl = LEVEL_THRESHOLDS[i].level;
      break;
    }
  }

  if (currentLvl > appState.level) {
    appState.level = currentLvl;
    playSound('fanfare');
    const lvlInfo = LEVEL_THRESHOLDS.find(l => l.level === currentLvl);
    showToast(`Level Up! Selamat, kamu naik pangkat menjadi ${lvlInfo.name} ${lvlInfo.emblem}!`, '🎉');
  }
}

// 10 Badges Gamifikasi
const BADGES_CONFIG = [
  {
    id: 'badge_bronze',
    name: 'Bronze Trader',
    desc: 'Meraih nilai 60–69 pada Final Mission.',
    icon: '🥉',
    check: () => appState.finalExamScore !== null && appState.finalExamScore >= 60 && appState.finalExamScore < 70
  },
  {
    id: 'badge_silver',
    name: 'Silver Trader',
    desc: 'Meraih nilai 70–84 pada Final Mission.',
    icon: '🥈',
    check: () => appState.finalExamScore !== null && appState.finalExamScore >= 70 && appState.finalExamScore < 85
  },
  {
    id: 'badge_gold',
    name: 'Gold Trader',
    desc: 'Meraih nilai 85–94 pada Final Mission.',
    icon: '🥇',
    check: () => appState.finalExamScore !== null && appState.finalExamScore >= 85 && appState.finalExamScore < 95
  },
  {
    id: 'badge_master',
    name: 'Master Trader',
    desc: 'Meraih nilai 95–100 pada Final Mission.',
    icon: '👑',
    check: () => appState.finalExamScore !== null && appState.finalExamScore >= 95
  },
  {
    id: 'badge_pelaut',
    name: 'Pelaut Perintis',
    desc: 'Menyelesaikan Modul 1 (Pengenalan Perdagangan Internasional).',
    icon: '🧭',
    check: () => appState.modulesDone.mod1 === true
  },
  {
    id: 'badge_diplomat',
    name: 'Diplomat Regulasi',
    desc: 'Menyelesaikan Modul 2 & 3 (Jenis Kebijakan & Dampak).',
    icon: '📜',
    check: () => appState.modulesDone.mod2 === true && appState.modulesDone.mod3 === true
  },
  {
    id: 'badge_menteri',
    name: 'Menteri Teladan',
    desc: 'Menyelesaikan seluruh 4 skenario simulasi di Trade Lab.',
    icon: '🏛️',
    check: () => appState.labDone.scen1 && appState.labDone.scen2 && appState.labDone.scen3 && appState.labDone.scen4
  },
  {
    id: 'badge_matching',
    name: 'Kolektor Istilah',
    desc: 'Menyelesaikan Game Trade Matching dengan sempurna.',
    icon: '🧩',
    check: () => appState.completedActivities.includes('game_matching_master')
  },
  {
    id: 'badge_mystery',
    name: 'Penjelajah Misteri',
    desc: 'Membuka dan menjawab seluruh 6 Mystery Box.',
    icon: '🎁',
    check: () => appState.mysteryBoxesOpened.every(box => box === true)
  },
  {
    id: 'badge_challenge_champ',
    name: 'Juara Tantangan',
    desc: 'Memainkan dan menyelesaikan seluruh 4 Game di Challenge Zone.',
    icon: '🏆',
    check: () => appState.gamesPlayed.tebak && appState.gamesPlayed.match && appState.gamesPlayed.tf && appState.gamesPlayed.mystery
  }
];

function checkBadges() {
  BADGES_CONFIG.forEach(badge => {
    if (!appState.unlockedBadges.includes(badge.id)) {
      if (badge.check()) {
        appState.unlockedBadges.push(badge.id);
        playSound('fanfare');
        showToast(`Badge Baru Terbuka: [${badge.name}] ${badge.icon}!`, '🎖️');
      }
    }
  });
}

function calculateOverallProgress() {
  let points = 0;
  // 3 Modul = 30 poin (10 per modul)
  if (appState.modulesDone.mod1) points += 10;
  if (appState.modulesDone.mod2) points += 10;
  if (appState.modulesDone.mod3) points += 10;

  // 4 Lab = 20 poin (5 per lab)
  if (appState.labDone.scen1) points += 5;
  if (appState.labDone.scen2) points += 5;
  if (appState.labDone.scen3) points += 5;
  if (appState.labDone.scen4) points += 5;

  // 4 Game = 20 poin (5 per game)
  if (appState.gamesPlayed.tebak) points += 5;
  if (appState.gamesPlayed.match) points += 5;
  if (appState.gamesPlayed.tf) points += 5;
  if (appState.gamesPlayed.mystery) points += 5;

  // Final Exam = 30 poin
  if (appState.finalExamScore !== null) points += 30;

  return Math.min(100, Math.round(points));
}

function updateUI() {
  // Update XP navbar badge
  const navXP = document.getElementById('navXpDisplay');
  if (navXP) navXP.innerText = `${appState.xp} XP`;

  // Update Progress Bar Global (Home & Stats)
  const pct = calculateOverallProgress();
  const homeProgBar = document.getElementById('homeProgressBar');
  const homeProgText = document.getElementById('homeProgressText');
  if (homeProgBar) homeProgBar.style.width = `${pct}%`;
  if (homeProgText) homeProgText.innerText = `${pct}% Selesai`;

  // Update Stat Boxes Home
  const statModules = document.getElementById('statModulesCount');
  if (statModules) {
    const doneCount = Object.values(appState.modulesDone).filter(Boolean).length;
    statModules.innerText = `${doneCount}/3`;
  }

  const statLab = document.getElementById('statLabCount');
  if (statLab) {
    const labCount = Object.values(appState.labDone).filter(Boolean).length;
    statLab.innerText = `${labCount}/4`;
  }

  const statBadges = document.getElementById('statBadgesCount');
  if (statBadges) {
    statBadges.innerText = `${appState.unlockedBadges.length}/10`;
  }

  // Update Module Complete Buttons
  ['mod1', 'mod2', 'mod3'].forEach((mKey, idx) => {
    const btn = document.getElementById(`btnComplete-${mKey}`);
    const tabBadge = document.getElementById(`tabBadge-${mKey}`);
    if (appState.modulesDone[mKey]) {
      if (btn) {
        btn.classList.add('completed');
        btn.innerHTML = '<span>Modul Selesai</span> <span class="badge-done">✓</span>';
      }
      if (tabBadge) tabBadge.style.display = 'inline-block';
    } else {
      if (btn) {
        btn.classList.remove('completed');
        btn.innerHTML = '<span>Tandai Selesai</span> (+100 XP)';
      }
      if (tabBadge) tabBadge.style.display = 'none';
    }
  });

  // Update Achievement Page Elements
  const lvlInfo = LEVEL_THRESHOLDS.find(l => l.level === appState.level) || LEVEL_THRESHOLDS[0];
  const achLevelName = document.getElementById('achLevelName');
  const achLevelEmblem = document.getElementById('achLevelEmblem');
  const achLevelSub = document.getElementById('achLevelSub');
  const achLevelXpBar = document.getElementById('achLevelXpBar');
  const achLevelXpCur = document.getElementById('achLevelXpCur');
  const achLevelXpMax = document.getElementById('achLevelXpMax');

  if (achLevelName) achLevelName.innerText = `Level ${appState.level}: ${lvlInfo.name}`;
  if (achLevelEmblem) achLevelEmblem.innerText = lvlInfo.emblem;
  if (achLevelSub) achLevelSub.innerText = `Kumpulkan XP dengan menyelesaikan modul, simulasi lab, dan game!`;

  if (achLevelXpBar && achLevelXpCur && achLevelXpMax) {
    const nextLvl = LEVEL_THRESHOLDS.find(l => l.level === appState.level + 1);
    const max = nextLvl ? nextLvl.minXP : lvlInfo.maxXP;
    achLevelXpCur.innerText = `${appState.xp} XP`;
    achLevelXpMax.innerText = nextLvl ? `Target: ${max} XP` : 'Pangkat Maksimal!';
    const lvlPct = nextLvl ? Math.min(100, Math.round(((appState.xp - lvlInfo.minXP) / (max - lvlInfo.minXP)) * 100)) : 100;
    achLevelXpBar.style.width = `${lvlPct}%`;
  }

  // Render 10 Badges in Achievement Page
  renderBadgesGrid();
}

function renderBadgesGrid() {
  const container = document.getElementById('badgesGridContainer');
  if (!container) return;

  container.innerHTML = '';
  BADGES_CONFIG.forEach(badge => {
    const isUnlocked = appState.unlockedBadges.includes(badge.id);
    const card = document.createElement('div');
    card.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;
    card.innerHTML = `
      <div class="badge-icon-box">${badge.icon}</div>
      <h5>${badge.name}</h5>
      <p>${badge.desc}</p>
      <span class="badge-status-pill ${isUnlocked ? 'pill-unlocked' : 'pill-locked'}">
        ${isUnlocked ? 'Terbuka' : 'Terkunci'}
      </span>
    `;
    container.appendChild(card);
  });
}

// ==========================================================================
// 2. WEB AUDIO API SYNTHESIZER (Tanpa File Eksternal)
// ==========================================================================
let audioContext = null;

function initAudio() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioContext = new AudioCtx();
  }
}

function toggleSound() {
  appState.soundEnabled = !appState.soundEnabled;
  saveState();
  const icon = document.getElementById('soundIcon');
  if (icon) {
    icon.innerText = appState.soundEnabled ? '🔊' : '🔇';
  }
  showToast(appState.soundEnabled ? 'Suara Diaktifkan' : 'Suara Dimatikan', '🔔');
}

function playSound(type) {
  if (!appState.soundEnabled) return;
  try {
    initAudio();
    if (!audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume();

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.22);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'fanfare') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const nOsc = audioContext.createOscillator();
        const nGain = audioContext.createGain();
        nOsc.connect(nGain);
        nGain.connect(audioContext.destination);
        nOsc.frequency.setValueAtTime(freq, now + i * 0.09);
        nGain.gain.setValueAtTime(0.12, now + i * 0.09);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.28);
        nOsc.start(now + i * 0.09);
        nOsc.stop(now + i * 0.09 + 0.28);
      });
    }
  } catch (e) {
    console.warn('Audio synthesis not supported or blocked:', e);
  }
}

// ==========================================================================
// 3. SPA ROUTING & NAVIGATION
// ==========================================================================
const ALL_VIEWS = ['home', 'explore', 'tradelab', 'challenge', 'finalmission', 'achievement', 'profile'];

function navigateTo(viewId) {
  if (!ALL_VIEWS.includes(viewId)) return;
  playSound('click');

  ALL_VIEWS.forEach(id => {
    const viewEl = document.getElementById(`view-${id}`);
    const navBtn = document.getElementById(`nav-${id}`);
    const mobBtn = document.getElementById(`mob-${id}`);

    if (viewEl) viewEl.classList.remove('active-view');
    if (navBtn) navBtn.classList.remove('active');
    if (mobBtn) mobBtn.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${viewId}`);
  const targetNav = document.getElementById(`nav-${viewId}`);
  const targetMob = document.getElementById(`mob-${viewId}`);

  if (targetView) targetView.classList.add('active-view');
  if (targetNav) targetNav.classList.add('active');
  if (targetMob) targetMob.classList.add('active');

  // Close mobile drawer if open
  const mobileNav = document.getElementById('mobileNavDrawer');
  if (mobileNav) mobileNav.classList.remove('open');

  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateUI();
}

function toggleMobileNav() {
  const mobileNav = document.getElementById('mobileNavDrawer');
  if (mobileNav) mobileNav.classList.toggle('open');
}

// ==========================================================================
// 4. TOAST & MODAL HELPERS
// ==========================================================================
let toastTimeout = null;

function showToast(message, icon = '✨') {
  const toast = document.getElementById('globalToast');
  if (!toast) return;

  toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span> <span>${message}</span>`;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function openModal(modalId) {
  playSound('click');
  const el = document.getElementById(modalId);
  if (el) el.classList.add('show');
}

function closeModal(modalId) {
  playSound('click');
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('show');
}

// ==========================================================================
// 5. EXPLORE VIEW (3 Modul Pembelajaran & Mini Quiz)
// ==========================================================================
function switchModuleTab(modKey) {
  playSound('click');
  ['mod1', 'mod2', 'mod3', 'video'].forEach(k => {
    const tab = document.getElementById(`tabBtn-${k}`);
    const pane = document.getElementById(`pane-${k}`);
    if (tab) tab.classList.remove('active');
    if (pane) pane.classList.remove('active');
  });

  const activeTab = document.getElementById(`tabBtn-${modKey}`);
  const activePane = document.getElementById(`pane-${modKey}`);
  if (activeTab) activeTab.classList.add('active');
  if (activePane) activePane.classList.add('active');
}

function completeModule(modKey) {
  if (appState.modulesDone[modKey]) {
    showToast('Modul ini sudah pernah kamu selesaikan!', 'ℹ️');
    return;
  }

  appState.modulesDone[modKey] = true;
  const modNames = {
    mod1: 'Modul 1: Pengenalan & Kebijakan',
    mod2: 'Modul 2: Jenis Kebijakan Perdagangan',
    mod3: 'Modul 3: Dampak Kebijakan Perdagangan'
  };

  awardXP(100, `complete_${modKey}`, modNames[modKey]);
  updateUI();
}

// Mini Quiz Data inside Modules
const miniQuizData = {
  q_mod1: {
    question: 'Mengapa negara Indonesia tetap melakukan impor gandum dari luar negeri meskipun merupakan negara agraris?',
    options: [
      { text: 'A. Karena selera masyarakat Indonesia hanya menyukai produk luar negeri', correct: false },
      { text: 'B. Karena iklim tropis Indonesia tidak cocok secara komparatif untuk budidaya gandum massal', correct: true },
      { text: 'C. Karena biaya impor gandum selalu lebih mahal dari beras', correct: false },
      { text: 'D. Karena peraturan internasional mewajibkan setiap negara mengimpor gandum', correct: false }
    ],
    explanation: 'Benar! Faktor kondisi geografis dan iklim membuat Indonesia tidak efisien membudidayakan gandum dibanding negara empat musim. Indonesia fokus memproduksi kelapa sawit dan rempah (keunggulan komparatif).'
  },
  q_mod2: {
    question: 'Strategi pemerintah Indonesia yang melarang ekspor bijih nikel mentah (raw nickel) ke luar negeri dan mewajibkan smelter di dalam negeri merupakan contoh dari...',
    options: [
      { text: 'A. Praktik politik dumping', correct: false },
      { text: 'B. Kebijakan larangan ekspor untuk hilirisasi industri bernilai tambah', correct: true },
      { text: 'C. Kebijakan kuota impor bebas', correct: false },
      { text: 'D. Kebijakan subsidi ekspor barang mentah', correct: false }
    ],
    explanation: 'Tepat sekali! Larangan ekspor bijih mentah dilakukan agar nikel diolah menjadi feronikel dan baterai di dalam negeri (hilirisasi), meningkatkan devisa dan membuka lapangan kerja.'
  },
  q_mod3: {
    question: 'Siapakah pihak yang paling diuntungkan ketika pemerintah menetapkan tarif bea masuk yang tinggi atas produk pakaian jadi (tekstil) impor?',
    options: [
      { text: 'A. Produsen tekstil dan konveksi dalam negeri', correct: true },
      { text: 'B. Konsumen yang mencari pakaian impor murah', correct: false },
      { text: 'C. Eksportir asing dari negara mitra', correct: false },
      { text: 'D. Perusahaan jasa ekspedisi luar negeri', correct: false }
    ],
    explanation: 'Tepat! Tarif bea masuk membuat harga pakaian impor naik, sehingga produk konveksi produsen lokal menjadi lebih kompetitif dan diminati di pasar domestik.'
  }
};

function answerMiniQuiz(quizKey, optIndex, btnElement) {
  const quiz = miniQuizData[quizKey];
  if (!quiz) return;

  const parent = btnElement.parentElement;
  const buttons = parent.querySelectorAll('.mini-opt-btn');
  const feedbackEl = document.getElementById(`feedback-${quizKey}`);

  // Disable buttons
  buttons.forEach(b => b.disabled = true);

  const isCorrect = quiz.options[optIndex].correct;

  if (isCorrect) {
    btnElement.classList.add('correct');
    playSound('correct');
    awardXP(30, `mini_quiz_${quizKey}`, 'Mini Kuis Modul');
    if (feedbackEl) {
      feedbackEl.className = 'mini-quiz-feedback show success';
      feedbackEl.innerHTML = `<strong>Jawaban Benar!</strong> ${quiz.explanation}`;
    }
  } else {
    btnElement.classList.add('wrong');
    playSound('wrong');
    if (feedbackEl) {
      feedbackEl.className = 'mini-quiz-feedback show fail';
      feedbackEl.innerHTML = `<strong>Kurang Tepat.</strong> ${quiz.explanation}`;
    }
  }
}

// ==========================================================================
// 6. TRADE LAB (Simulasi Kebijakan Menteri Perdagangan Indonesia)
// ==========================================================================
const tradeLabScenarios = {
  scen1: {
    id: 'scen1',
    title: 'Skenario 1: Produk Lokal Terdesak Impor Murah',
    icon: '👔',
    tag: 'Kasus Tekstil & Pakaian Jadi',
    desc: 'Pasar domestik dibanjiri pakaian jadi impor dengan harga sangat murah dari negara tetangga. Ribuan pelaku UMKM konveksi lokal di Bandung dan Solo mengalami penurunan penjualan drastis hingga terancam gulung tikar. Apa langkah Anda sebagai Menteri Perdagangan?',
    choices: [
      {
        id: 'A',
        name: 'Menaikkan Tarif Bea Masuk Pakaian Impor sebesar 25%',
        desc: 'Mengenakan pajak impor tambahan agar harga pakaian impor di pasaran menjadi lebih mahal.',
        meters: { produsen: 85, konsumen: 60, ketersediaan: 80, devisa: 88 },
        status: 'optimal',
        statusLabel: 'Kebijakan Proteksi Terukur',
        consequence: 'Produsen tekstil lokal terlindungi karena harga produk impor naik. Kas negara mendapat tambahan penerimaan bea masuk. Konsumen mengalami sedikit kenaikan harga pakaian impor, namun pasar tetap seimbang.'
      },
      {
        id: 'B',
        name: 'Menerapkan Kuota Impor Ketat Maksimal 50.000 Ton/Tahun',
        desc: 'Membatasi kuantitas fisik pakaian jadi yang boleh masuk ke dalam negeri.',
        meters: { produsen: 90, konsumen: 45, ketersediaan: 55, devisa: 65 },
        status: 'moderate',
        statusLabel: 'Protektif Ketat - Waspada Kelangkaan',
        consequence: 'UMKM lokal sangat terlindungi. Namun, pembatasan ketat memicu risiko lonjakan harga di tingkat konsumen serta potensi penyelundupan ilegal (*black market*).'
      },
      {
        id: 'C',
        name: 'Bebaskan Impor Penuh Tanpa Tarif (Free Market)',
        desc: 'Membiarkan persaingan pasar bebas sepenuhnya demi menekan harga serendah mungkin.',
        meters: { produsen: 20, konsumen: 95, ketersediaan: 95, devisa: 30 },
        status: 'risky',
        statusLabel: 'Krisis Industri Lokal',
        consequence: 'Konsumen menikmati pakaian super murah. Akan tetapi, pabrik dan UMKM garmen lokal gulung tikar massal, menimbulkan PHK puluhan ribu buruh dan neraca dagang defisit!'
      },
      {
        id: 'D',
        name: 'Beri Subsidi Mesin & Pelatihan Desain bagi UMKM Tekstil',
        desc: 'Fokus memperkuat daya saing efisiensi dan kualitas produsen dalam negeri.',
        meters: { produsen: 90, konsumen: 80, ketersediaan: 85, devisa: 75 },
        status: 'optimal',
        statusLabel: 'Strategi Daya Saing Jangka Panjang',
        consequence: 'Sangat efektif dalam jangka panjang! Efisiensi dan mutu produk lokal meningkat tanpa menekan daya beli konsumen, meskipun membutuhkan anggaran subsidi dari kas negara.'
      }
    ]
  },
  scen2: {
    id: 'scen2',
    title: 'Skenario 2: Kebutuhan Barang Pokok Meningkat',
    icon: '🌾',
    tag: 'Kasus Pasokan Beras & Pangan',
    desc: 'Fenomena El Nino ekstrem memicu gagal panen di sejumlah lumbung padi nasional. Menjelang hari raya, stok beras menipis dan harga eceran tertinggi melonjak 30%, memicu keresahan masyarakat. Kebijakan apa yang Anda ambil?',
    choices: [
      {
        id: 'A',
        name: 'Impor Beras Terukur melalui Perum BULOG untuk Operasi Pasar',
        desc: 'Mendatangkan cadangan beras pemerintah dari Vietnam/Thailand khusus untuk menstabilkan harga.',
        meters: { produsen: 70, konsumen: 92, ketersediaan: 95, devisa: 75 },
        status: 'optimal',
        statusLabel: 'Stabilisasi Pangan Berhasil',
        consequence: 'Ketersediaan pangan terjamin aman, harga beras terkendali kembali normal sehingga inflasi pangan dapat diredam. Dilakukan saat panen raya belum tiba agar tidak mematikan harga gabah petani.'
      },
      {
        id: 'B',
        name: 'Melarang Total Seluruh Impor Beras demi Proteksi Petani',
        desc: 'Menolak opsi impor apapun dan memaksa hanya mengandalkan stok lokal yang tersisa.',
        meters: { produsen: 80, konsumen: 20, ketersediaan: 25, devisa: 80 },
        status: 'risky',
        statusLabel: 'Bencana Inflasi & Kelangkaan',
        consequence: 'Petani yang panen menikmati harga tinggi, namun masyarakat luas menderita lonjakan harga ekstrem dan kelangkaan bahan pokok. Rawan memicu gejolak sosial!'
      },
      {
        id: 'C',
        name: 'Mengenakan Tarif Bea Masuk Sangat Tinggi pada Beras Impor',
        desc: 'Pajak impor 60% untuk menghalangi beras luar negeri masuk.',
        meters: { produsen: 75, konsumen: 35, ketersediaan: 40, devisa: 60 },
        status: 'risky',
        statusLabel: 'Beban Harga Tambahan',
        consequence: 'Beras impor yang masuk justru menjadi semakin mahal di toko-toko. Tujuan menstabilkan harga gagal dan konsumen semakin terbebani di masa paceklik.'
      },
      {
        id: 'D',
        name: 'Bantuan Pangan Beras & Pembebasan Bea Masuk Sementara',
        desc: 'Menghapus sementara tarif impor bahan pangan pokok selama 3 bulan krisis.',
        meters: { produsen: 65, konsumen: 90, ketersediaan: 92, devisa: 70 },
        status: 'optimal',
        statusLabel: 'Respons Darurat Efektif',
        consequence: 'Harga cepat meredam dan pasokan masuk lancar. Setelah masa darurat panen lokal pulih, bea masuk dapat diberlakukan kembali untuk melindungi petani.'
      }
    ]
  },
  scen3: {
    id: 'scen3',
    title: 'Skenario 3: Produk Ekspor Sulit Bersaing di Pasar Global',
    icon: '🪵',
    tag: 'Kasus Furnitur & Kerajinan UMKM',
    desc: 'Produk furnitur ukir kayu jati dan rotan khas Indonesia kalah bersaing di pasar Eropa dan Amerika Serikat akibat ongkos logistik kapal yang mahal dan persyaratan sertifikasi lingkungan yang rumit. Apa keputusan Anda?',
    choices: [
      {
        id: 'A',
        name: 'Beri Subsidi Pengiriman Ekspor & Pendampingan Sertifikasi Ramah Lingkungan',
        desc: 'Pemerintah membantu sebagian biaya sertifikasi SVLK dan logistik kontainer.',
        meters: { produsen: 95, konsumen: 80, ketersediaan: 80, devisa: 92 },
        status: 'optimal',
        statusLabel: 'Peningkatan Daya Saing Ekspor',
        consequence: 'Eksportir furnitur Indonesia mampu memenuhi standar sertifikasi hijau Eropa dan harga jual ekspor menjadi lebih kompetitif. Nilai ekspor dan cadangan devisa nasional melonjak!'
      },
      {
        id: 'B',
        name: 'Menutup Pasar Ekspor dan Mewajibkan Penjualan Domestik Saja',
        desc: 'Menghentikan pengiriman ke luar negeri dan menjual semua produk di dalam negeri.',
        meters: { produsen: 30, konsumen: 75, ketersediaan: 90, devisa: 20 },
        status: 'risky',
        statusLabel: 'Kehilangan Devisa Berharga',
        consequence: 'Pasar dalam negeri kelebihan pasokan (*oversupply*), harga furnitur anjlok, pengrajin merugi, dan negara kehilangan potensi devisa ratusan juta dolar.'
      },
      {
        id: 'C',
        name: 'Menerapkan Pajak Ekspor Tinggi untuk Menekan Produsen',
        desc: 'Menarik pungutan ekspor tambahan pada komoditas olahan kayu.',
        meters: { produsen: 25, konsumen: 60, ketersediaan: 80, devisa: 35 },
        status: 'risky',
        statusLabel: 'Mematikan Minat Ekspor',
        consequence: 'Pungutan tambahan membuat harga produk di luar negeri semakin tidak kompetitif. Pembeli luar negeri beralih ke produsen Vietnam dan Malaysia.'
      },
      {
        id: 'D',
        name: 'Diplomasi Perjanjian Dagang Bilateral (FTA/CEPA) Tarif Nol Persen',
        desc: 'Negosiasi penurunan tarif bea masuk khusus dengan negara-negara tujuan ekspor.',
        meters: { produsen: 90, konsumen: 85, ketersediaan: 85, devisa: 94 },
        status: 'optimal',
        statusLabel: 'Kemitraan Strategis Global',
        consequence: 'Perjanjian dagang melenyapkan hambatan tarif di negara tujuan, membuka akses pasar bebas bagi produk ekspor kreatif Indonesia.'
      }
    ]
  },
  scen4: {
    id: 'scen4',
    title: 'Skenario 4: Dugaan Praktik Dumping pada Baja Impor',
    icon: '🏗️',
    tag: 'Kasus Industri Baja & Material Nasional',
    desc: 'Komite Anti Dumping Indonesia (KADI) menemukan bukti kuat bahwa produk baja canai dingin impor dijual di Indonesia dengan harga 35% lebih rendah dibandingkan harga di negara produsen asalnya. Pabrik baja nasional (seperti PT Krakatau Steel) terancam lumpuh. Apa langkah Anda?',
    choices: [
      {
        id: 'A',
        name: 'Pemberlakuan Bea Masuk Anti-Dumping (BMAD) Berdasarkan Regulasi WTO',
        desc: 'Mengenakan pungutan khusus setara margin dumping untuk memulihkan harga wajar.',
        meters: { produsen: 92, konsumen: 75, ketersediaan: 80, devisa: 85 },
        status: 'optimal',
        statusLabel: 'Penegakan Hukum Perdagangan yang Sah',
        consequence: 'Praktik perdagangan tidak sehat (*unfair trade*) berhasil dinetralkan. Industri baja nasional kembali memiliki persaingan yang adil tanpa melanggar traktat perdagangan dunia (WTO).'
      },
      {
        id: 'B',
        name: 'Membiarkan Praktik Tersebut Berlanjut demi Bahan Bangunan Murah',
        desc: 'Mendiamkan dugaan dumping agar sektor konstruksi dapat membeli baja murah.',
        meters: { produsen: 20, konsumen: 85, ketersediaan: 85, devisa: 35 },
        status: 'risky',
        statusLabel: 'Ketergantungan Asing Fatal',
        consequence: 'Pabrik baja dalam negeri bangkrut dan tutup. Setelah produsen lokal mati, negara pengekspor dapat menaikkan harga monopoli sesuka hati, melumpuhkan kedaulatan industri dasar nasional!'
      },
      {
        id: 'C',
        name: 'Melarang Total Seluruh Barang dari Negara Pengekspor Tanpa Investigasi',
        desc: 'Tindakan boikot sepihak secara emosional.',
        meters: { produsen: 60, konsumen: 30, ketersediaan: 40, devisa: 25 },
        status: 'risky',
        statusLabel: 'Sengketa Dagang Internasional',
        consequence: 'Negara mitra melayangkan gugatan ke pengadilan WTO. Indonesia terancam sanksi retaliasi dagang di mana produk ekspor unggulan kita (seperti CPO dan karet) dibalas boikot.'
      },
      {
        id: 'D',
        name: 'BMAD Terukur Disertai Restrukturisasi Mesin Pabrik Baja Lokal',
        desc: 'Menerapkan bea anti-dumping sekaligus mendorong modernisasi pabrik dalam negeri.',
        meters: { produsen: 95, konsumen: 78, ketersediaan: 82, devisa: 88 },
        status: 'optimal',
        statusLabel: 'Kemenangan Mutlak Industri Nasional',
        consequence: 'Kombinasi terbaik! Industri baja dalam negeri terlindung dari serbuan dumping, sekaligus terpacu untuk meningkatkan efisiensi dan daya saing teknologi secara mandiri.'
      }
    ]
  }
};

let currentLabScenario = 'scen1';
let selectedPolicyChoice = null;

function selectLabScenario(scenKey) {
  playSound('click');
  currentLabScenario = scenKey;
  selectedPolicyChoice = null;

  // Update pills
  ['scen1', 'scen2', 'scen3', 'scen4'].forEach(k => {
    const pill = document.getElementById(`pill-${k}`);
    if (pill) pill.classList.remove('active');
  });

  const activePill = document.getElementById(`pill-${scenKey}`);
  if (activePill) activePill.classList.add('active');

  renderLabScenario();
}

function renderLabScenario() {
  const scen = tradeLabScenarios[currentLabScenario];
  if (!scen) return;

  const briefingTag = document.getElementById('labBriefingTag');
  const briefingTitle = document.getElementById('labBriefingTitle');
  const briefingDesc = document.getElementById('labBriefingDesc');
  const choiceContainer = document.getElementById('labPolicyChoices');
  const reportCard = document.getElementById('labReportCard');

  if (briefingTag) briefingTag.innerText = scen.tag;
  if (briefingTitle) briefingTitle.innerText = scen.title;
  if (briefingDesc) briefingDesc.innerText = scen.desc;

  if (reportCard) reportCard.classList.remove('active');

  // Render Choices
  if (choiceContainer) {
    choiceContainer.innerHTML = '';
    scen.choices.forEach(ch => {
      const card = document.createElement('div');
      card.className = `policy-choice-card ${selectedPolicyChoice === ch.id ? 'selected' : ''}`;
      card.onclick = () => choosePolicy(ch.id, card);
      card.innerHTML = `
        <div class="choice-radio"></div>
        <div class="choice-info">
          <h5>Opsi ${ch.id}: ${ch.name}</h5>
          <p>${ch.desc}</p>
        </div>
      `;
      choiceContainer.appendChild(card);
    });
  }
}

function choosePolicy(choiceId, targetCard) {
  playSound('click');
  selectedPolicyChoice = choiceId;
  const scen = tradeLabScenarios[currentLabScenario];
  const choice = scen.choices.find(c => c.id === choiceId);
  if (!choice) return;

  // Re-render choice selection styles
  const cards = document.querySelectorAll('.policy-choice-card');
  cards.forEach(c => c.classList.remove('selected'));
  if (targetCard) {
    targetCard.classList.add('selected');
  }

  // Show simulation results & meters
  const reportCard = document.getElementById('labReportCard');
  if (reportCard) {
    reportCard.classList.add('active');

    // Status Indicator
    const statusInd = document.getElementById('labStatusIndicator');
    if (statusInd) {
      statusInd.className = `status-indicator status-${choice.status}`;
      statusInd.innerText = choice.statusLabel;
    }

    // Set Meters
    setMeterValue('meterProdusen', 'valProdusen', choice.meters.produsen);
    setMeterValue('meterKonsumen', 'valKonsumen', choice.meters.konsumen);
    setMeterValue('meterKetersediaan', 'valKetersediaan', choice.meters.ketersediaan);
    setMeterValue('meterDevisa', 'valDevisa', choice.meters.devisa);

    // Consequence Text
    const conText = document.getElementById('labConsequenceText');
    if (conText) conText.innerText = choice.consequence;

    // Scroll slightly down to results
    reportCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Mark Scenario Done & Award XP
  appState.labDone[currentLabScenario] = true;
  awardXP(80, `lab_${currentLabScenario}_${choiceId}`, `Simulasi Lab: ${scen.title}`);
  updateUI();
}

function setMeterValue(barId, valId, score) {
  const bar = document.getElementById(barId);
  const val = document.getElementById(valId);
  if (val) val.innerText = `${score}/100`;

  if (bar) {
    bar.style.width = `${score}%`;
    bar.className = 'meter-fill';
    if (score >= 75) bar.classList.add('fill-emerald');
    else if (score >= 50) bar.classList.add('fill-amber');
    else bar.classList.add('fill-rose');
  }
}

// ==========================================================================
// 7. CHALLENGE ZONE (4 Permainan Edukatif yang Benar-benar Bisa Dimainkan)
// ==========================================================================
function switchChallengeGame(gameId) {
  playSound('click');
  ['tebak', 'matching', 'tf', 'mystery'].forEach(g => {
    const tab = document.getElementById(`tabGame-${g}`);
    const stage = document.getElementById(`stage-${g}`);
    if (tab) tab.classList.remove('active');
    if (stage) stage.classList.remove('active-game');
  });

  const activeTab = document.getElementById(`tabGame-${gameId}`);
  const activeStage = document.getElementById(`stage-${gameId}`);
  if (activeTab) activeTab.classList.add('active');
  if (activeStage) activeStage.classList.add('active-game');

  // Trigger initialization if needed
  if (gameId === 'matching') initTradeMatchingGame();
}

// --------------------------------------------------------------------------
// GAME 1: Tebak Kebijakan (10 Soal Berjenjang)
// --------------------------------------------------------------------------
const game1Questions = [
  {
    tag: 'Studi Kasus 1',
    q: 'Pemerintah menetapkan batas maksimal kuantitas impor daging sapi sebanyak 100.000 ton untuk tahun 2026. Kebijakan ini disebut...',
    options: ['A. Kuota Impor', 'B. Subsidi Ekspor', 'C. Politik Dumping', 'D. Bea Keluar'],
    correct: 0,
    exp: 'Kuota impor adalah kebijakan perdagangan luar negeri yang membatasi jumlah fisik maksimum barang tertentu yang boleh diimpor selama masa tertentu.'
  },
  {
    tag: 'Studi Kasus 2',
    q: 'Negara Alpha menjual produk elektronik di pasar Indonesia dengan harga $100, padahal harga di pasar dalam negerinya adalah $160. Praktik ini dinamakan...',
    options: ['A. Tarif Bebas', 'B. Politik Dumping', 'C. Proteksionisme Murni', 'D. Devaluasi'],
    correct: 1,
    exp: 'Politik dumping adalah tindakan menjual barang di pasar luar negeri dengan harga lebih murah daripada harga di dalam negerinya untuk merebut pangsa pasar.'
  },
  {
    tag: 'Studi Kasus 3',
    q: 'Pemerintah memberikan bantuan dana sebesar 10% dari biaya produksi kepada perajin batik lokal agar batik Indonesia bisa diekspor dengan harga murah. Ini adalah...',
    options: ['A. Embargo Ekspor', 'B. Bea Cukai', 'C. Subsidi Ekspor', 'D. Kuota Tarif'],
    correct: 2,
    exp: 'Subsidi ekspor adalah bantuan finansial atau insentif pemerintah kepada produsen domestik untuk menurunkan biaya ekspor sehingga lebih kompetitif.'
  },
  {
    tag: 'Studi Kasus 4',
    q: 'Pajak sebesar 15% yang dikenakan oleh Ditjen Bea Cukai atas setiap unit ponsel pintar yang diimpor dari luar negeri dinamakan...',
    options: ['A. Tarif / Bea Masuk', 'B. Premi Dagang', 'C. Pajak Bumi & Bangunan', 'D. Larangan Impor'],
    correct: 0,
    exp: 'Tarif atau bea masuk adalah pajak yang dipungut atas barang yang melintasi daerah pabean untuk masuk ke dalam wilayah suatu negara.'
  },
  {
    tag: 'Studi Kasus 5',
    q: 'Larangan mutlak pengiriman bijih mentah bauksit dan nikel ke luar negeri untuk memacu hilirisasi di dalam negeri adalah contoh...',
    options: ['A. Larangan Ekspor', 'B. Pasar Bebas', 'C. Dumping Predator', 'D. Subsidi Konsumsi'],
    correct: 0,
    exp: 'Larangan ekspor adalah regulasi yang secara mutlak melarang penjualan komoditas tertentu ke mancanegara untuk kepentingan strategis nasional.'
  },
  {
    tag: 'Studi Kasus 6',
    q: 'Kebijakan yang membiarkan arus barang dan jasa antarnegara bergerak tanpa hambatan tarif maupun non-tarif disebut...',
    options: ['A. Proteksionisme', 'B. Perdagangan Bebas (Free Trade)', 'C. Autarki', 'D. Merkantilisme'],
    correct: 1,
    exp: 'Perdagangan bebas menghendaki penghapusan restriksi tarif dan regulasi pembatas dalam transaksi perdagangan internasional.'
  },
  {
    tag: 'Studi Kasus 7',
    q: 'Pemberlakuan bea tambahan oleh negara pengimpor atas barang yang terbukti dijual di bawah harga wajar asal disebut...',
    options: ['A. Bea Masuk Tindakan Pengamanan', 'B. Bea Masuk Imbalan', 'C. Bea Masuk Anti-Dumping (BMAD)', 'D. Diskon Tarif'],
    correct: 2,
    exp: 'BMAD (Bea Masuk Anti-Dumping) dipungut untuk memulihkan kerugian industri domestik akibat serbuan produk berharga dumping.'
  },
  {
    tag: 'Studi Kasus 8',
    q: 'Filosofi kebijakan ekonomi yang sengaja membatasi impor untuk melindungi lapangan kerja dan industri baru (*infant industry*) di dalam negeri dinamakan...',
    options: ['A. Proteksionisme', 'B. Globalisasi Neoliberal', 'C. Monopoli Asing', 'D. Laissez-faire'],
    correct: 0,
    exp: 'Proteksionisme bertujuan memayungi produsen lokal dari tekanan persaingan luar negeri melalui instrumen tarif, kuota, dan regulasi ketat.'
  },
  {
    tag: 'Studi Kasus 9',
    q: 'Pemberian penghargaan atau bonus tunai dari pemerintah kepada eksportir yang berhasil menembus pasar baru disebut...',
    options: ['A. Premi Ekspor', 'B. Kuota Ekspor', 'C. Pajak Ekspor', 'D. Devaluasi'],
    correct: 0,
    exp: 'Premi ekspor merupakan insentif khusus yang diberikan kepada produsen yang melampaui target ekspor atau berprestasi di kancah global.'
  },
  {
    tag: 'Studi Kasus 10',
    q: 'Ketika Indonesia dan Jepang menyepakati pengurangan bea masuk menjadi 0% untuk produk otomotif dan pertanian secara timbal balik, kesepakatan ini berwujud...',
    options: ['A. Perjanjian Dagang Bebas Bilateral (FTA/EPA)', 'B. Embargo Total', 'C. Kartel Perdagangan', 'D. Diskriminasi Sanksi'],
    correct: 0,
    exp: 'Free Trade Agreement (FTA) / Economic Partnership Agreement (EPA) adalah pakta bilateral/multilateral untuk menurunkan tarif dagang bersama.'
  }
];

let g1Index = 0;
let g1Score = 0;

function renderGame1Question() {
  const q = game1Questions[g1Index];
  const tagEl = document.getElementById('g1Tag');
  const textEl = document.getElementById('g1QuestionText');
  const optContainer = document.getElementById('g1OptionsContainer');
  const feedbackEl = document.getElementById('g1FeedbackBox');
  const trackerEl = document.getElementById('g1Tracker');
  const nextBtn = document.getElementById('g1NextBtn');

  if (trackerEl) trackerEl.innerText = `Soal ${g1Index + 1} / ${game1Questions.length}`;
  if (tagEl) tagEl.innerText = q.tag;
  if (textEl) textEl.innerText = q.q;
  if (feedbackEl) feedbackEl.className = 'g1-feedback-box';
  if (nextBtn) nextBtn.style.display = 'none';

  if (optContainer) {
    optContainer.innerHTML = '';
    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'g1-opt-btn';
      btn.innerText = optText;
      btn.onclick = () => answerGame1(idx, btn);
      optContainer.appendChild(btn);
    });
  }
}

function answerGame1(optIndex, btnEl) {
  const q = game1Questions[g1Index];
  const buttons = document.querySelectorAll('.g1-opt-btn');
  const feedbackEl = document.getElementById('g1FeedbackBox');
  const nextBtn = document.getElementById('g1NextBtn');

  buttons.forEach(b => b.disabled = true);

  if (optIndex === q.correct) {
    btnEl.classList.add('correct');
    playSound('correct');
    g1Score++;
    document.getElementById('g1ScoreDisplay').innerText = `Skor: ${g1Score * 10}`;
    if (feedbackEl) {
      feedbackEl.className = 'g1-feedback-box show success';
      feedbackEl.style.background = '#ecfdf5';
      feedbackEl.style.color = '#065f46';
      feedbackEl.style.border = '1px solid #10b981';
      feedbackEl.innerHTML = `<strong>Tepat Sekali!</strong> ${q.exp}`;
    }
  } else {
    btnEl.classList.add('wrong');
    playSound('wrong');
    buttons[q.correct].classList.add('correct');
    if (feedbackEl) {
      feedbackEl.className = 'g1-feedback-box show fail';
      feedbackEl.style.background = '#fef2f2';
      feedbackEl.style.color = '#991b1b';
      feedbackEl.style.border = '1px solid #ef4444';
      feedbackEl.innerHTML = `<strong>Jawaban Kurang Tepat.</strong> ${q.exp}`;
    }
  }

  if (nextBtn) {
    nextBtn.style.display = 'inline-flex';
    nextBtn.innerText = g1Index === game1Questions.length - 1 ? 'Lihat Hasil Akhir' : 'Soal Selanjutnya →';
  }
}

function nextGame1Question() {
  playSound('click');
  g1Index++;
  if (g1Index < game1Questions.length) {
    renderGame1Question();
  } else {
    finishGame1();
  }
}

function finishGame1() {
  playSound('fanfare');
  appState.gamesPlayed.tebak = true;
  const totalXP = g1Score * 15;
  awardXP(totalXP, 'game_tebak_kebijakan', 'Game Tebak Kebijakan');

  const container = document.getElementById('g1GameplayView');
  const resultCard = document.getElementById('g1ResultCard');

  if (container) container.style.display = 'none';
  if (resultCard) {
    resultCard.style.display = 'block';
    document.getElementById('g1FinalScore').innerText = `${g1Score * 10} / 100`;
    document.getElementById('g1FinalDetail').innerText = `Kamu menjawab ${g1Score} dari 10 skenario kebijakan perdagangan internasional dengan benar!`;
  }
  updateUI();
}

function resetGame1() {
  playSound('click');
  g1Index = 0;
  g1Score = 0;
  document.getElementById('g1ScoreDisplay').innerText = 'Skor: 0';
  document.getElementById('g1GameplayView').style.display = 'block';
  document.getElementById('g1ResultCard').style.display = 'none';
  renderGame1Question();
}

// --------------------------------------------------------------------------
// GAME 2: Trade Matching (Mencocokkan 6 Istilah & Definisi)
// --------------------------------------------------------------------------
const tradeMatchingData = [
  { id: 'm1', term: 'Tarif / Bea Masuk', def: 'Pajak atas barang impor untuk menaikkan harga jualnya di pasar domestik.' },
  { id: 'm2', term: 'Kuota Impor', def: 'Pembatasan jumlah fisik maksimum komoditas asing yang boleh masuk dalam periode tertentu.' },
  { id: 'm3', term: 'Subsidi Ekspor', def: 'Bantuan dana pemerintah kepada produsen dalam negeri agar harga ekspornya lebih murah.' },
  { id: 'm4', term: 'Politik Dumping', def: 'Praktik menjual barang di pasar luar negeri lebih murah dibanding di pasar dalam negeri.' },
  { id: 'm5', term: 'Proteksionisme', def: 'Kebijakan pemerintah untuk melindungi industri domestik dari persaingan impor bebas.' },
  { id: 'm6', term: 'Larangan Ekspor', def: 'Kebijakan larangan mutlak mengeluarkan komoditas tertentu demi hilirisasi nasional.' }
];

let selectedTermId = null;
let selectedDefId = null;
let matchCount = 0;

function initTradeMatchingGame() {
  matchCount = 0;
  selectedTermId = null;
  selectedDefId = null;
  document.getElementById('matchCounter').innerText = '0 / 6';
  document.getElementById('matchVictoryNotice').style.display = 'none';

  const termsCol = document.getElementById('matchTermsCol');
  const defsCol = document.getElementById('matchDefsCol');

  // Shuffle
  const shuffledTerms = [...tradeMatchingData].sort(() => Math.random() - 0.5);
  const shuffledDefs = [...tradeMatchingData].sort(() => Math.random() - 0.5);

  if (termsCol) {
    termsCol.innerHTML = '';
    shuffledTerms.forEach(item => {
      const card = document.createElement('div');
      card.id = `term-${item.id}`;
      card.className = 'matching-card';
      card.innerHTML = `<span>${item.term}</span> <span style="color: #94a3b8;">○</span>`;
      card.onclick = () => selectMatchingTerm(item.id, card);
      termsCol.appendChild(card);
    });
  }

  if (defsCol) {
    defsCol.innerHTML = '';
    shuffledDefs.forEach(item => {
      const card = document.createElement('div');
      card.id = `def-${item.id}`;
      card.className = 'matching-card';
      card.innerHTML = `<span>${item.def}</span> <span style="color: #94a3b8;">○</span>`;
      card.onclick = () => selectMatchingDef(item.id, card);
      defsCol.appendChild(card);
    });
  }
}

function selectMatchingTerm(id, cardEl) {
  playSound('click');
  if (cardEl.classList.contains('matched')) return;

  document.querySelectorAll('#matchTermsCol .matching-card').forEach(c => {
    if (!c.classList.contains('matched')) c.classList.remove('selected');
  });

  selectedTermId = id;
  cardEl.classList.add('selected');
  checkMatchingPair();
}

function selectMatchingDef(id, cardEl) {
  playSound('click');
  if (cardEl.classList.contains('matched')) return;

  document.querySelectorAll('#matchDefsCol .matching-card').forEach(c => {
    if (!c.classList.contains('matched')) c.classList.remove('selected');
  });

  selectedDefId = id;
  cardEl.classList.add('selected');
  checkMatchingPair();
}

function checkMatchingPair() {
  if (!selectedTermId || !selectedDefId) return;

  const termEl = document.getElementById(`term-${selectedTermId}`);
  const defEl = document.getElementById(`def-${selectedDefId}`);

  if (selectedTermId === selectedDefId) {
    // Cocok!
    playSound('correct');
    matchCount++;
    document.getElementById('matchCounter').innerText = `${matchCount} / 6`;

    termEl.classList.remove('selected');
    defEl.classList.remove('selected');
    termEl.classList.add('matched');
    defEl.classList.add('matched');

    termEl.innerHTML = `<span>${termEl.innerText.replace('○', '')}</span> <span style="color: #10b981;">✓</span>`;
    defEl.innerHTML = `<span>${defEl.innerText.replace('○', '')}</span> <span style="color: #10b981;">✓</span>`;

    selectedTermId = null;
    selectedDefId = null;

    if (matchCount === 6) {
      playSound('fanfare');
      appState.gamesPlayed.match = true;
      awardXP(120, 'game_matching_master', 'Game Trade Matching Selesai');
      document.getElementById('matchVictoryNotice').style.display = 'block';
      updateUI();
    }
  } else {
    // Salah
    playSound('wrong');
    termEl.style.borderColor = '#ef4444';
    defEl.style.borderColor = '#ef4444';

    setTimeout(() => {
      if (!termEl.classList.contains('matched')) {
        termEl.classList.remove('selected');
        termEl.style.borderColor = '';
      }
      if (!defEl.classList.contains('matched')) {
        defEl.classList.remove('selected');
        defEl.style.borderColor = '';
      }
      selectedTermId = null;
      selectedDefId = null;
    }, 450);
  }
}

// --------------------------------------------------------------------------
// GAME 3: True or False (10 Pernyataan Cepat)
// --------------------------------------------------------------------------
const tfData = [
  {
    stmt: 'Ekspor menghasilkan penerimaan devisa bagi negara eksportir.',
    answer: true,
    exp: 'Benar! Pembeli asing membayar komoditas ekspor menggunakan mata uang asing/devisa yang masuk ke cadangan devisa nasional.'
  },
  {
    stmt: 'Menerapkan tarif bea masuk yang sangat tinggi selalu menguntungkan konsumen karena harga barang di pasar menjadi lebih murah.',
    answer: false,
    exp: 'Salah! Tarif bea masuk justru menaikkan harga jual barang impor di pasar sehingga konsumen harus membayar lebih mahal.'
  },
  {
    stmt: 'David Ricardo adalah tokoh pencetus Teori Keunggulan Mutlak (Absolute Advantage).',
    answer: false,
    exp: 'Salah! Teori Keunggulan Mutlak dicetuskan oleh Adam Smith, sedangkan David Ricardo mencetuskan Teori Keunggulan Komparatif.'
  },
  {
    stmt: 'Kebijakan kuota impor membatasi secara fisik kuantitas barang asing yang diizinkan masuk ke dalam negeri.',
    answer: true,
    exp: 'Benar! Kuota impor menetapkan batas maksimum tonase atau unit barang impor selama kurun waktu tertentu.'
  },
  {
    stmt: 'Politik dumping diperbolehkan secara bebas dan tidak pernah ditentang oleh organisasi perdagangan dunia (WTO).',
    answer: false,
    exp: 'Salah! Dumping dianggap praktik perdagangan tidak sehat (*unfair trade*) sehingga negara yang dirugikan berhak menerapkan Bea Masuk Anti-Dumping (BMAD).'
  },
  {
    stmt: 'Indonesia melarang ekspor bijih nikel mentah untuk mendorong hilirisasi industri di dalam negeri.',
    answer: true,
    exp: 'Benar! Larangan ekspor bijih mentah mewajibkan pengolahan melalui smelter domestik agar bernilai tambah tinggi.'
  },
  {
    stmt: 'Perdagangan internasional hanya dapat dilakukan oleh pemerintah antarnegara dan tidak boleh dilakukan oleh individu atau swasta.',
    answer: false,
    exp: 'Salah! Pelaku perdagangan internasional meliputi individu, perusahaan swasta, BUMN, maupun antar-pemerintah.'
  },
  {
    stmt: 'Letter of Credit (L/C) adalah sistem jaminan pembayaran perdagangan internasional yang diterbitkan oleh pihak bank.',
    answer: true,
    exp: 'Benar! L/C memberikan kepastian pembayaran kepada eksportir begitu dokumen pengapalan barang tervalidasi sah.'
  },
  {
    stmt: 'Proteksionisme adalah paham yang mendukung penghapusan total seluruh bea masuk dan tarif di seluruh dunia.',
    answer: false,
    exp: 'Salah! Itu adalah konsep Perdagangan Bebas (Free Trade). Proteksionisme justru membatasi impor untuk memayungi industri lokal.'
  },
  {
    stmt: 'Spesialisasi produksi berdasarkan keunggulan komparatif dapat meningkatkan efisiensi total output dunia.',
    answer: true,
    exp: 'Benar! Tiap negara memproduksi barang dengan biaya peluang (*opportunity cost*) terendah sehingga sumber daya dunia teralokasi optimal.'
  }
];

let tfIndex = 0;
let tfScore = 0;

function renderTFStatement() {
  const item = tfData[tfIndex];
  const trackerEl = document.getElementById('tfTracker');
  const stmtEl = document.getElementById('tfStatementText');
  const feedbackEl = document.getElementById('tfFeedbackBox');
  const nextBtn = document.getElementById('tfNextBtn');
  const btnRow = document.getElementById('tfButtonRow');

  if (trackerEl) trackerEl.innerText = `Pernyataan ${tfIndex + 1} / ${tfData.length}`;
  if (stmtEl) stmtEl.innerText = `"${item.stmt}"`;
  if (feedbackEl) feedbackEl.className = 'tf-feedback';
  if (nextBtn) nextBtn.style.display = 'none';

  if (btnRow) {
    btnRow.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

function answerTF(userChoice) {
  const item = tfData[tfIndex];
  const isCorrect = userChoice === item.answer;
  const feedbackEl = document.getElementById('tfFeedbackBox');
  const nextBtn = document.getElementById('tfNextBtn');
  const btnRow = document.getElementById('tfButtonRow');

  if (btnRow) {
    btnRow.querySelectorAll('button').forEach(b => b.disabled = true);
  }

  if (isCorrect) {
    playSound('correct');
    tfScore++;
    document.getElementById('tfScoreDisplay').innerText = `Skor: ${tfScore * 10}`;
    if (feedbackEl) {
      feedbackEl.className = 'tf-feedback show';
      feedbackEl.style.background = '#ecfdf5';
      feedbackEl.style.color = '#065f46';
      feedbackEl.style.border = '1px solid #10b981';
      feedbackEl.innerHTML = `<strong>Tepat!</strong> ${item.exp}`;
    }
  } else {
    playSound('wrong');
    if (feedbackEl) {
      feedbackEl.className = 'tf-feedback show';
      feedbackEl.style.background = '#fef2f2';
      feedbackEl.style.color = '#991b1b';
      feedbackEl.style.border = '1px solid #ef4444';
      feedbackEl.innerHTML = `<strong>Kurang Tepat.</strong> ${item.exp}`;
    }
  }

  if (nextBtn) {
    nextBtn.style.display = 'inline-flex';
    nextBtn.innerText = tfIndex === tfData.length - 1 ? 'Selesai & Lihat Skor' : 'Lanjut →';
  }
}

function nextTF() {
  playSound('click');
  tfIndex++;
  if (tfIndex < tfData.length) {
    renderTFStatement();
  } else {
    finishTF();
  }
}

function finishTF() {
  playSound('fanfare');
  appState.gamesPlayed.tf = true;
  const totalXP = tfScore * 12;
  awardXP(totalXP, 'game_tf_complete', 'Game True or False');

  document.getElementById('tfPlayView').style.display = 'none';
  const resCard = document.getElementById('tfResultCard');
  if (resCard) {
    resCard.style.display = 'block';
    document.getElementById('tfFinalScore').innerText = `${tfScore * 10} / 100`;
    document.getElementById('tfFinalDetail').innerText = `Kamu berhasil menjawab ${tfScore} dari 10 pernyataan dengan tepat!`;
  }
  updateUI();
}

function resetTF() {
  playSound('click');
  tfIndex = 0;
  tfScore = 0;
  document.getElementById('tfScoreDisplay').innerText = 'Skor: 0';
  document.getElementById('tfPlayView').style.display = 'block';
  document.getElementById('tfResultCard').style.display = 'none';
  renderTFStatement();
}

// --------------------------------------------------------------------------
// GAME 4: Mystery Box (6 Kotak Misteri dengan Berbagai Kesulitan)
// --------------------------------------------------------------------------
const mysteryBoxesData = [
  {
    boxNum: 1,
    title: 'Kotak 1: Peti Kayu Tropis',
    diff: 'Mudah',
    xpReward: 50,
    icon: '📦',
    question: 'Jika nilai ekspor suatu negara lebih besar daripada nilai impornya, maka neraca perdagangan negara tersebut mengalami...',
    options: ['A. Defisit Dagang', 'B. Surplus Dagang', 'C. Devaluasi Moneter', 'D. Inflasi Domestik'],
    correct: 1,
    exp: 'Ketika ekspor > impor, neraca perdagangan surplus dan menambah cadangan devisa.'
  },
  {
    boxNum: 2,
    title: 'Kotak 2: Peti Logam Kembar',
    diff: 'Mudah',
    xpReward: 50,
    icon: '🎁',
    question: 'Mata uang asing yang diakui secara luas di seluruh dunia sebagai alat pembayaran internasional yang kuat disebut...',
    options: ['A. Soft Currency', 'B. Hard Currency (Devisa Keras)', 'C. Kripto Spekulasi', 'D. Uang Giral Daerah'],
    correct: 1,
    exp: 'Contoh hard currency meliputi US Dollar, Euro, Japanese Yen, dan British Pound.'
  },
  {
    boxNum: 3,
    title: 'Kotak 3: Peti Perunggu Pabean',
    diff: 'Sedang',
    xpReward: 80,
    icon: '🧰',
    question: 'Jika pemerintah mendevaluasi mata uang Rupiah terhadap Dollar AS, dampak langsung yang diharapkan pada sektor perdagangan adalah...',
    options: ['A. Ekspor menjadi lebih murah di mata asing sehingga meningkat', 'B. Impor menjadi lebih murah dan melonjak tajam', 'C. Cadangan devisa langsung berkurang', 'D. Perdagangan internasional terhenti total'],
    correct: 0,
    exp: 'Devaluasi membuat barang domestik berharga lebih murah bagi pembeli luar negeri sehingga mendorong daya saing ekspor.'
  },
  {
    boxNum: 4,
    title: 'Kotak 4: Peti Perak Diplomasi',
    diff: 'Sedang',
    xpReward: 80,
    icon: '🪙',
    question: 'Tindakan penolakan atau larangan berdagang dengan negara tertentu karena alasan konflik politik/pelanggaran HAM internasional disebut...',
    options: ['A. Kuota Pangan', 'B. Subsidi Silang', 'C. Embargo Ekonomi', 'D. Kartel Komoditas'],
    correct: 2,
    exp: 'Embargo adalah larangan resmi perniagaan atau perdagangan dengan negara tertentu sebagai sanksi ekonomi.'
  },
  {
    boxNum: 5,
    title: 'Kotak 5: Peti Emas Samudera',
    diff: 'Sulit',
    xpReward: 120,
    icon: '👑',
    question: 'Menurut David Ricardo, dasar utama terjadinya perdagangan internasional yang saling menguntungkan adalah perbedaan...',
    options: ['A. Biaya peluang (opportunity cost) produksi antarnegara', 'B. Jumlah mata uang yang dicetak masing-masing bank sentral', 'C. Jumlah utang luar negeri', 'D. Luas wilayah daratan negara semata'],
    correct: 0,
    exp: 'Teori Keunggulan Komparatif berpijak pada efisiensi biaya peluang pengorbanan komoditas alternatif.'
  },
  {
    boxNum: 6,
    title: 'Kotak 6: Peti Kristal Nusantara',
    diff: 'Sulit',
    xpReward: 120,
    icon: '💎',
    question: 'Instrumen pembayaran internasional di mana barang dikirim terlebih dahulu oleh eksportir dan pembayaran dilunasi setelah barang tiba di importir disebut...',
    options: ['A. Cash in Advance', 'B. Open Account', 'C. Commercial Letter of Credit', 'D. Barter Konsinyasi'],
    correct: 1,
    exp: 'Open account memberikan risiko tinggi bagi eksportir karena pelunasan terjadi pasca barang diterima pembeli.'
  }
];

let activeMysteryBox = null;

function renderMysteryBoxesGrid() {
  const grid = document.getElementById('mysteryBoxesGrid');
  if (!grid) return;

  grid.innerHTML = '';
  mysteryBoxesData.forEach((box, idx) => {
    const isOpened = appState.mysteryBoxesOpened[idx];
    const item = document.createElement('div');
    item.className = `mystery-box-item ${isOpened ? 'opened' : ''}`;
    item.onclick = () => openMysteryModal(idx);

    const diffClass = box.diff === 'Mudah' ? 'diff-easy' : box.diff === 'Sedang' ? 'diff-med' : 'diff-hard';

    item.innerHTML = `
      <div class="box-icon-wrap">${isOpened ? '🔓' : box.icon}</div>
      <h5>${box.title}</h5>
      <span class="diff-badge ${diffClass}">${box.diff} (+${box.xpReward} XP)</span>
      <p style="font-size: 0.76rem; margin-top: 8px;">${isOpened ? 'Sudah Terbuka ✓' : 'Klik untuk Membuka'}</p>
    `;
    grid.appendChild(item);
  });
}

function openMysteryModal(boxIndex) {
  playSound('click');
  const box = mysteryBoxesData[boxIndex];
  activeMysteryBox = boxIndex;

  const modal = document.getElementById('mysteryModalBackdrop');
  const titleEl = document.getElementById('mysteryModalTitle');
  const diffEl = document.getElementById('mysteryModalDiff');
  const qEl = document.getElementById('mysteryModalQ');
  const optEl = document.getElementById('mysteryModalOptions');
  const fbEl = document.getElementById('mysteryModalFeedback');

  if (titleEl) titleEl.innerText = box.title;
  if (diffEl) diffEl.innerText = `Tingkat: ${box.diff} • Hadiah: ${box.xpReward} XP`;
  if (qEl) qEl.innerText = box.question;
  if (fbEl) fbEl.style.display = 'none';

  if (optEl) {
    optEl.innerHTML = '';
    box.options.forEach((optText, i) => {
      const btn = document.createElement('button');
      btn.className = 'g1-opt-btn';
      btn.style.width = '100%';
      btn.style.marginBottom = '8px';
      btn.innerText = optText;
      btn.onclick = () => solveMysteryBox(i, btn);
      optEl.appendChild(btn);
    });
  }

  if (modal) modal.classList.add('show');
}

function solveMysteryBox(optIdx, btnEl) {
  const box = mysteryBoxesData[activeMysteryBox];
  const buttons = document.querySelectorAll('#mysteryModalOptions button');
  const fbEl = document.getElementById('mysteryModalFeedback');

  buttons.forEach(b => b.disabled = true);

  if (optIdx === box.correct) {
    playSound('correct');
    btnEl.classList.add('correct');
    appState.mysteryBoxesOpened[activeMysteryBox] = true;
    appState.gamesPlayed.mystery = true;
    awardXP(box.xpReward, `mystery_box_${activeMysteryBox}`, `Mystery ${box.title}`);

    if (fbEl) {
      fbEl.style.display = 'block';
      fbEl.style.background = '#ecfdf5';
      fbEl.style.color = '#065f46';
      fbEl.style.padding = '12px';
      fbEl.style.borderRadius = '8px';
      fbEl.style.marginTop = '12px';
      fbEl.innerHTML = `<strong>Peti Berhasil Dibuka!</strong> ${box.exp}`;
    }
  } else {
    playSound('wrong');
    btnEl.classList.add('wrong');
    buttons[box.correct].classList.add('correct');
    if (fbEl) {
      fbEl.style.display = 'block';
      fbEl.style.background = '#fef2f2';
      fbEl.style.color = '#991b1b';
      fbEl.style.padding = '12px';
      fbEl.style.borderRadius = '8px';
      fbEl.style.marginTop = '12px';
      fbEl.innerHTML = `<strong>Kunci Gagal.</strong> ${box.exp}`;
    }
  }

  renderMysteryBoxesGrid();
  updateUI();
}

function closeMysteryModal() {
  playSound('click');
  const modal = document.getElementById('mysteryModalBackdrop');
  if (modal) modal.classList.remove('show');
}

function resetMysteryBoxes() {
  playSound('click');
  appState.mysteryBoxesOpened = [false, false, false, false, false, false];
  saveState();
  renderMysteryBoxesGrid();
  showToast('Semua kotak misteri berhasil diatur ulang!', '🔄');
}

// ==========================================================================
// 8. FINAL MISSION (15 Soal Evaluasi Akhir Terstandar)
// ==========================================================================
const finalExamQuestions = [
  {
    q: '1. Manakah di bawah ini yang merupakan pengertian paling tepat dari perdagangan internasional?',
    options: [
      'A. Transaksi jual beli barang dan jasa yang dilakukan antarpenduduk suatu negara dengan penduduk negara lain atas dasar kesepakatan bersama',
      'B. Kegiatan konsumsi komoditas dalam negeri oleh masyarakat pedesaan dan perkotaan',
      'C. Pembelian surat utang negara oleh Bank Indonesia untuk mengendalikan suku bunga',
      'D. Pertukaran mata uang rupiah lama dengan rupiah emisi baru di pasar valas'
    ],
    correct: 0,
    exp: 'Perdagangan internasional adalah proses pertukaran barang dan jasa yang melintasi batas-batas teritorial wilayah hukum kepabeanan antarnegara.'
  },
  {
    q: '2. Tokoh ekonom klasik yang mengemukakan Teori Keunggulan Komparatif (Comparative Advantage) pada tahun 1817 adalah...',
    options: [
      'A. Adam Smith',
      'B. David Ricardo',
      'C. John Maynard Keynes',
      'D. Alfred Marshall'
    ],
    correct: 1,
    exp: 'David Ricardo mengemukakan teori keunggulan komparatif dalam bukunya On the Principles of Political Economy and Taxation.'
  },
  {
    q: '3. Pajak yang dipungut atas barang impor dengan tujuan meningkatkan penerimaan kas negara serta melindungi produk domestik disebut...',
    options: [
      'A. Tarif atau Bea Masuk',
      'B. Pajak Pertambahan Nilai Domestik',
      'C. Subsidi Pembelian',
      'D. Premi Risiko Usaha'
    ],
    correct: 0,
    exp: 'Tarif/bea masuk dikenakan di pelabuhan pabean saat barang luar negeri tiba untuk menaikkan harga jualnya agar produk lokal terlindungi.'
  },
  {
    q: '4. Pembatasan kuantitas fisik maksimum komoditas impor yang diperbolehkan masuk ke suatu negara dalam jangka waktu tertentu disebut...',
    options: [
      'A. Kuota Impor',
      'B. Politik Dumping',
      'C. Diskriminasi Harga',
      'D. Devaluasi'
    ],
    correct: 0,
    exp: 'Kuota impor membatasi volume fisik (tonase/unit) barang luar negeri untuk mencegah banjir pasokan di dalam negeri.'
  },
  {
    q: '5. Kebijakan di mana produsen menjual produk di luar negeri dengan harga lebih murah daripada di pasar domestik dikenal sebagai...',
    options: [
      'A. Embargo',
      'B. Kuota Impor',
      'C. Politik Dumping',
      'D. Tarif Preferensial'
    ],
    correct: 2,
    exp: 'Dumping merupakan praktik diskriminasi harga internasional di mana harga ekspor sengaja dipatok lebih rendah dari harga domestik.'
  },
  {
    q: '6. Bea Masuk Anti-Dumping (BMAD) diberlakukan oleh pemerintah bertujuan untuk...',
    options: [
      'A. Memberikan subsidi kepada importir luar negeri',
      'B. Menetralkan efek kerugian industri lokal akibat produk impor yang dijual di bawah harga wajar',
      'C. Menghilangkan seluruh pengawasan bea cukai di perbatasan laut',
      'D. Mendorong masyarakat membeli barang impor sebanyak-banyaknya'
    ],
    correct: 1,
    exp: 'BMAD adalah instrumen sah di bawah aturan WTO untuk mengembalikan level persaingan yang adil dari gempuran barang dumping.'
  },
  {
    q: '7. Manakah berikut ini yang BUKAN merupakan sumber penerimaan devisa bagi negara Indonesia?',
    options: [
      'A. Ekspor minyak kelapa sawit (CPO) dan batu bara',
      'B. Pengeluaran devisa untuk membayar pokok dan bunga utang luar negeri',
      'C. Belanja wisatawan mancanegara yang berwisata ke destinasi Indonesia',
      'D. Remitansi uang dari Tenaga Kerja Indonesia (TKI) di luar negeri'
    ],
    correct: 1,
    exp: 'Pembayaran utang ke luar negeri adalah arus PENGELUARAN/PENGURANGAN devisa, bukan sumber penerimaan devisa.'
  },
  {
    q: '8. Surat jaminan pembayaran yang dikeluarkan oleh bank pembuka (issuing bank) atas permintaan importir kepada eksportir disebut...',
    options: [
      'A. Letter of Credit (L/C)',
      'B. Bill of Lading (B/L)',
      'C. Wesel Tagih Domestik',
      'D. Cek Mundur'
    ],
    correct: 0,
    exp: 'Letter of Credit (L/C) adalah instrumen pembayaran paling aman karena pihak perbankan menjamin pelunasan jika syarat dokumen terpenuhi.'
  },
  {
    q: '9. Jika nilai ekspor suatu negara lebih kecil daripada nilai impornya, kondisi neraca perdagangan negara tersebut dinamakan...',
    options: [
      'A. Surplus',
      'B. Defisit',
      'C. Seimbang Murni',
      'D. Ekuilibrium Global'
    ],
    correct: 1,
    exp: 'Defisit neraca perdagangan terjadi ketika nilai impor melampaui nilai ekspor (Impor > Ekspor).'
  },
  {
    q: '10. Kebijakan pemerintah Indonesia melarang ekspor bijih nikel mentah ke luar negeri memiliki tujuan utama yaitu...',
    options: [
      'A. Mengurangi pasokan listrik di dalam negeri',
      'B. Mendorong hilirisasi industri agar Indonesia mengekspor produk jadi/setengah jadi berharga tinggi',
      'C. Memaksa negara mitra menghentikan hubungan diplomatik',
      'D. Mengosongkan cadangan tambang mineral nasional'
    ],
    correct: 1,
    exp: 'Hilirisasi nikel meningkatkan nilai tambah puluhan kali lipat, menyerap tenaga kerja lokal, dan menggenjot penerimaan pajak serta devisa.'
  },
  {
    q: '11. Dampak negatif dari penerapan kebijakan proteksionisme tarif impor yang terlampau tinggi bagi konsumen adalah...',
    options: [
      'A. Konsumen harus membayar harga barang yang lebih mahal dan pilihan produk menjadi terbatas',
      'B. Konsumen memperoleh barang berkualitas tinggi secara gratis',
      'C. Pendapatan riil konsumen otomatis meningkat dua kali lipat',
      'D. Daya beli masyarakat miskin terlindungi secara mutlak'
    ],
    correct: 0,
    exp: 'Tarif tinggi mengerek harga barang impor dan produk pengganti lokal, sehingga surplus konsumen berkurang (*consumer burden*).'
  },
  {
    q: '12. Bantuan finansial yang disalurkan pemerintah kepada produsen lokal agar mampu memasarkan produknya dengan harga murah di luar negeri disebut...',
    options: [
      'A. Kuota Impor',
      'B. Subsidi Ekspor',
      'C. Bea Keluar Fiskal',
      'D. Pajak Penjualan'
    ],
    correct: 1,
    exp: 'Subsidi ekspor meringankan ongkos produksi eksportir domestik sehingga mampu memenangkan persaingan di pasar internasional.'
  },
  {
    q: '13. Hubungan perdagangan yang disepakati oleh dua negara secara langsung untuk memfasilitasi pertukaran barang disebut perdagangan...',
    options: [
      'A. Bilateral',
      'B. Multilateral',
      'C. Regional',
      'D. Unilateral'
    ],
    correct: 0,
    exp: 'Perdagangan bilateral melibatkan tepat dua negara mitra (misal: Indonesia dengan Jepang atau Indonesia dengan Australia).'
  },
  {
    q: '14. Salah satu faktor pendorong terjadinya perdagangan internasional yang berkaitan dengan kondisi alamiah adalah...',
    options: [
      'A. Keseragaman iklim dan struktur tanah di semua benua',
      'B. Perbedaan kekayaan Sumber Daya Alam (SDA) dan letak geografis',
      'C. Kesamaan budaya dan selera masyarakat global',
      'D. Penghapusan mata uang nasional di seluruh dunia'
    ],
    correct: 1,
    exp: 'Perbedaan kekayaan alamiah (seperti rempah tropis di Indonesia vs gandum di subtropis) memicu kebutuhan saling menukar hasil bumi.'
  },
  {
    q: '15. Manakah di bawah ini mata uang yang tergolong sebagai "Hard Currency" dalam cadangan devisa internasional?',
    options: [
      'A. Rupiah Indonesia dan Peso Filipina',
      'B. US Dollar (USD) dan Euro (EUR)',
      'C. Dong Vietnam dan Kip Laos',
      'D. Kyat Myanmar dan Riel Kamboja'
    ],
    correct: 1,
    exp: 'US Dollar dan Euro memiliki stabilitas tinggi dan diterima secara universal sebagai alat likuiditas pembayaran dunia.'
  }
];

let examAnswers = {};
let currentExamQIdx = 0;

function startFinalExam() {
  playSound('click');
  examAnswers = {};
  currentExamQIdx = 0;

  document.getElementById('examIntroSection').style.display = 'none';
  document.getElementById('examResultsCard').classList.remove('show');
  document.getElementById('examActiveCard').style.display = 'block';

  renderExamQuestionPalette();
  renderExamCurrentQuestion();
}

function renderExamQuestionPalette() {
  const container = document.getElementById('examQuestionPalette');
  if (!container) return;

  container.innerHTML = '';
  finalExamQuestions.forEach((_, idx) => {
    const btn = document.createElement('button');
    btn.className = `q-palette-btn ${currentExamQIdx === idx ? 'current' : ''} ${examAnswers[idx] !== undefined ? 'answered' : ''}`;
    btn.innerText = idx + 1;
    btn.onclick = () => jumpToExamQuestion(idx);
    container.appendChild(btn);
  });
}

function jumpToExamQuestion(idx) {
  playSound('click');
  currentExamQIdx = idx;
  renderExamQuestionPalette();
  renderExamCurrentQuestion();
}

function renderExamCurrentQuestion() {
  const q = finalExamQuestions[currentExamQIdx];
  const qTextEl = document.getElementById('examQuestionText');
  const optListEl = document.getElementById('examOptionsList');
  const counterEl = document.getElementById('examCounterBadge');
  const barEl = document.getElementById('examProgressBarFill');
  const prevBtn = document.getElementById('examPrevBtn');
  const nextBtn = document.getElementById('examNextBtn');
  const submitBtn = document.getElementById('examSubmitBtn');

  if (counterEl) counterEl.innerText = `Soal ${currentExamQIdx + 1} dari 15`;
  if (barEl) barEl.style.width = `${((currentExamQIdx + 1) / 15) * 100}%`;
  if (qTextEl) qTextEl.innerText = q.q;

  // Prev & Next Buttons state
  if (prevBtn) prevBtn.style.visibility = currentExamQIdx === 0 ? 'hidden' : 'visible';
  if (nextBtn) nextBtn.style.display = currentExamQIdx === 14 ? 'none' : 'inline-flex';
  if (submitBtn) submitBtn.style.display = currentExamQIdx === 14 ? 'inline-flex' : 'none';

  if (optListEl) {
    optListEl.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((optText, optIdx) => {
      const isSelected = examAnswers[currentExamQIdx] === optIdx;
      const card = document.createElement('div');
      card.className = `exam-option-card ${isSelected ? 'selected' : ''}`;
      card.onclick = () => selectExamOption(optIdx);

      card.innerHTML = `
        <div class="opt-letter-circle">${letters[optIdx]}</div>
        <div class="opt-text">${optText}</div>
      `;
      optListEl.appendChild(card);
    });
  }
}

function selectExamOption(optIdx) {
  playSound('click');
  examAnswers[currentExamQIdx] = optIdx;
  renderExamQuestionPalette();
  renderExamCurrentQuestion();
}

function examPrevQuestion() {
  if (currentExamQIdx > 0) {
    playSound('click');
    currentExamQIdx--;
    renderExamQuestionPalette();
    renderExamCurrentQuestion();
  }
}

function examNextQuestion() {
  if (currentExamQIdx < 14) {
    playSound('click');
    currentExamQIdx++;
    renderExamQuestionPalette();
    renderExamCurrentQuestion();
  }
}

function submitFinalExam() {
  playSound('click');
  const answeredCount = Object.keys(examAnswers).length;
  if (answeredCount < 15) {
    if (!confirm(`Kamu baru menjawab ${answeredCount} dari 15 soal. Yakin ingin mengumpulkan ujian sekarang?`)) {
      return;
    }
  }

  // Hitung Nilai: (Benar / 15) * 100
  let correctCount = 0;
  finalExamQuestions.forEach((q, idx) => {
    if (examAnswers[idx] === q.correct) {
      correctCount++;
    }
  });

  const finalScore = Math.round((correctCount / 15) * 100);
  appState.finalExamScore = finalScore;

  // Award XP based on score
  awardXP(finalScore * 2, 'final_exam_eval', 'Final Mission Evaluasi Akhir');

  // Check Badges based on score
  checkBadges();
  saveState();
  updateUI();

  // Show Results Card
  displayExamResults(correctCount, finalScore);
}

function displayExamResults(correctCount, score) {
  playSound('fanfare');
  document.getElementById('examActiveCard').style.display = 'none';
  const resCard = document.getElementById('examResultsCard');
  if (!resCard) return;

  resCard.classList.add('show');
  document.getElementById('examScoreNumber').innerText = score;

  // Predikat & Badge Pill
  const pillEl = document.getElementById('examBadgeEarnedPill');
  const titleEl = document.getElementById('examResultTitle');
  const descEl = document.getElementById('examResultDesc');

  let badgeName = '';
  if (score >= 95) {
    badgeName = 'Master Trader 👑';
    titleEl.innerText = 'Luar Biasa Sempurna!';
    descEl.innerText = 'Penguasaan konsep perdagangan internasionalmu setara Menteri Perdagangan profesional.';
  } else if (score >= 85) {
    badgeName = 'Gold Trader 🥇';
    titleEl.innerText = 'Sangat Membanggakan!';
    descEl.innerText = 'Kamu memahami seluruh regulasi, instrumen tarif, dan teori komparatif dengan sangat baik.';
  } else if (score >= 70) {
    badgeName = 'Silver Trader 🥈';
    titleEl.innerText = 'Hasil Memuaskan!';
    descEl.innerText = 'Sebagian besar materi ekonomi telah dikuasai dengan baik. Terus pertahankan prestasimu!';
  } else if (score >= 60) {
    badgeName = 'Bronze Trader 🥉';
    titleEl.innerText = 'Cukup Baik!';
    descEl.innerText = 'Kamu telah melewati batas ketuntasan minimum. Pelajari kembali materi modul untuk skor maksimal!';
  } else {
    badgeName = 'Calon Diplomat Perlu Latihan 🌱';
    titleEl.innerText = 'Perlu Pendalaman Materi';
    descEl.innerText = 'Jangan patah semangat! Pelajari kembali Modul 1, 2, dan 3 lalu ulangi evaluasi akhir ini.';
  }

  if (pillEl) {
    pillEl.innerHTML = `<span>Penghargaan:</span> <strong>${badgeName}</strong>`;
  }

  // Render Detailed Review of all 15 questions
  const reviewContainer = document.getElementById('examReviewList');
  if (reviewContainer) {
    reviewContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    finalExamQuestions.forEach((q, idx) => {
      const userAnsIdx = examAnswers[idx];
      const isCorrect = userAnsIdx === q.correct;

      const userText = userAnsIdx !== undefined ? `${letters[userAnsIdx]}. ${q.options[userAnsIdx]}` : 'Tidak dijawab';
      const correctText = `${letters[q.correct]}. ${q.options[q.correct]}`;

      const item = document.createElement('div');
      item.className = `review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`;
      item.innerHTML = `
        <div class="review-q-title">
          <span style="font-weight: 800; color: ${isCorrect ? '#10b981' : '#ef4444'};">
            ${isCorrect ? '✓ Benar' : '✗ Salah'}
          </span> — ${q.q}
        </div>
        <div class="review-detail">
          <p><strong>Jawaban Anda:</strong> ${userText}</p>
          ${!isCorrect ? `<p style="color: #065f46;"><strong>Kunci Jawaban:</strong> ${correctText}</p>` : ''}
          <p style="margin-top: 6px; font-style: italic; color: #475569;"><strong>Pembahasan:</strong> ${q.exp}</p>
        </div>
      `;
      reviewContainer.appendChild(item);
    });
  }

  window.scrollTo({ top: resCard.offsetTop - 80, behavior: 'smooth' });
}

function retakeFinalExam() {
  playSound('click');
  document.getElementById('examResultsCard').classList.remove('show');
  startFinalExam();
}

// ==========================================================================
// 9. EVENT LISTENERS & INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  // Set Sound Icon according to saved state
  const icon = document.getElementById('soundIcon');
  if (icon) {
    icon.innerText = appState.soundEnabled ? '🔊' : '🔇';
  }

  // Initialize Default Views
  selectLabScenario('scen1');
  renderGame1Question();
  initTradeMatchingGame();
  renderTFStatement();
  renderMysteryBoxesGrid();

  // Close modals when clicking backdrop
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('show');
    }
  });

  console.log('TRADE QUEST: Misi Menjelajahi Dunia Perdagangan v1.0 Ready.');
});
