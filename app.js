const questData = [
  {
    title: "Morning Tasks",
    icon: "🌅",
    tasks: [
      {
        id: "morning-1",
        title: "8:00 AM: Send check-out (CO) instructions to guests leaving the next day.",
        monster: "👾",
        treasure: "🪙",
        weapon: "cannon",
      },
      {
        id: "morning-2",
        title: "Review the calendar for arrivals today and tomorrow.",
        monster: "🐉",
        treasure: "💎",
        weapon: "arrow",
        subtasks: [
          {
            id: "morning-2-1",
            title: "Check for special requests (crib, bed, etc).",
          },
          {
            id: "morning-2-2",
            title: "Notify any special requests in the group chat.",
          },
        ],
      },
      {
        id: "morning-3",
        title: "Review special requests for current stays.",
        monster: "🦂",
        treasure: "🗝️",
        weapon: "laser",
        subtasks: [
          {
            id: "morning-3-1",
            title: "Confirm arrangements (e.g., fruit delivery, extras, follow-ups, cleaning, food delivery).",
          },
        ],
      },
    ],
  },
  {
    title: "Arrivals & Departures",
    icon: "🧳",
    tasks: [
      {
        id: "arrival-1",
        title: "Schedule and/or send check-in (CI) OK messages to today's arrivals at their confirmed check-in time.",
        monster: "🧟",
        treasure: "🪙",
        weapon: "rocket",
      },
      {
        id: "arrival-2",
        title: "Schedule and/or send 5-star review messages after the guests' confirmed check-out time for those checking out today.",
        monster: "🦑",
        treasure: "🏆",
        weapon: "magic",
      },
    ],
  },
  {
    title: "Reservations Follow-Up",
    icon: "📜",
    tasks: [
      {
        id: "reserv-1",
        title: "Review current month reservations.",
        monster: "🪨",
        treasure: "💰",
        weapon: "cannon",
      },
      {
        id: "reserv-2",
        title: "Review future month reservations.",
        monster: "🐲",
        treasure: "💎",
        weapon: "arrow",
      },
      {
        id: "reserv-3",
        title: "Follow up to complete missing checkmarks and get reservations marked in yellow.",
        monster: "🧠",
        treasure: "🗝️",
        weapon: "laser",
      },
    ],
  },
  {
    title: "Afternoon Tasks",
    icon: "🌇",
    tasks: [
      {
        id: "after-1",
        title: "Send to the group chat the next day's check-in and check-out times for each villa.",
        monster: "🦅",
        treasure: "🪙",
        weapon: "rocket",
      },
    ],
  },
  {
    title: "Notes / Important Observations",
    icon: "📝",
    tasks: [
      {
        id: "notes-1",
        title: "Anything relevant from today: guest feedback, issues, reminders, follow-ups",
        monster: "🧩",
        treasure: "📦",
        weapon: "magic",
        type: "note",
      },
    ],
  },
  {
    title: "Pending for Next Day",
    icon: "⏭️",
    tasks: [
      {
        id: "pending-1",
        title: "Tasks not completed today or items to follow up tomorrow",
        monster: "🛡️",
        treasure: "🎒",
        weapon: "cannon",
        type: "note",
      },
    ],
  },
];

const WEAPON_CONFIG = {
  cannon: { emoji: "💣", colors: ["#ff5c40", "#f9b84a"] },
  arrow:  { emoji: "🏹", colors: ["#5cff9e", "#a8ffcf"] },
  laser:  { emoji: "⚡", colors: ["#5cf2ff", "#4b76ff"] },
  rocket: { emoji: "🚀", colors: ["#ff5c78", "#f9b84a"] },
  magic:  { emoji: "🔮", colors: ["#9b7bff", "#d4a5ff"] },
};

const STORAGE_KEY = "quest-todo-state";
const META_KEY = "quest-todo-meta";
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const DEFAULT_PLAYER = "Jugador 1";

const state = loadState();
const meta = loadMeta();
const questBoard = document.getElementById("questBoard");
const progressEl = document.getElementById("progress");
const progressFill = document.getElementById("progressFill");
const completedCountEl = document.getElementById("completedCount");
const totalCountEl = document.getElementById("totalCount");
const levelEl = document.getElementById("level");
const xpEl = document.getElementById("xp");
const resetBtn = document.getElementById("resetBtn");
const celebration = document.getElementById("celebration");
const confetti = document.getElementById("confetti");
const fireworksCanvas = document.getElementById("fireworks");
const weekdayLabel = document.getElementById("weekdayLabel");
const playerLabel = document.getElementById("playerLabel");
const playerSelect = document.getElementById("playerSelect");
const playerStatus = document.getElementById("playerStatus");
const playerPassword = document.getElementById("playerPassword");
const playerLoginBtn = document.getElementById("playerLoginBtn");
const playerToggleBtn = document.getElementById("playerToggleBtn");
const audioToggle = document.getElementById("audioToggle");

let fireworksEngine = null;
let audioContext = null;
let audioEnabled = meta.audioEnabled ?? true;
let noteDebounce = null;
let cachedPlayers = [];
let authenticatedPlayerId = meta.authenticatedPlayerId || null;

render();
updateStats();
updateMetaUI();
loadPlayers();

resetBtn.addEventListener("click", () => {
  if (!confirm("¿Reiniciar todas las misiones del día?")) return;
  localStorage.removeItem(STORAGE_KEY);
  Object.keys(state).forEach((key) => delete state[key]);
  render();
  updateStats();
  stopCelebration();
  playSound("reset");
});

celebration.addEventListener("click", () => {
  stopCelebration();
});

playerSelect.addEventListener("change", () => {
  const selectedId = playerSelect.value;
  const selected = cachedPlayers.find((player) => player.id === selectedId);
  meta.player = selected ? selected.name : DEFAULT_PLAYER;
  authenticatedPlayerId = null;
  meta.authenticatedPlayerId = null;
  saveMeta();
  updateMetaUI();
});

playerLoginBtn.addEventListener("click", async () => {
  const selectedId = playerSelect.value;
  const selected = cachedPlayers.find((player) => player.id === selectedId);
  if (!selected) return;
  const password = playerPassword.value.trim();
  if (!password) {
    alert("Ingresa la clave del jugador.");
    return;
  }
  playerLoginBtn.disabled = true;
  try {
    const response = await fetch("/.netlify/functions/players-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: selected.id, password }),
    });
    if (!response.ok) {
      let message = "Clave incorrecta.";
      try {
        const data = await response.json();
        if (data?.message) message = data.message;
      } catch (error) {
        // ignore parsing errors
      }
      throw new Error(message);
    }
    authenticatedPlayerId = selected.id;
    meta.authenticatedPlayerId = selected.id;
    playerPassword.value = "";
    saveMeta();
    updateMetaUI();
    playSound("toggle");
  } catch (error) {
    alert(error.message || "Clave incorrecta.");
  } finally {
    playerLoginBtn.disabled = false;
  }
});

playerToggleBtn.addEventListener("click", async () => {
  const selectedId = playerSelect.value;
  const selected = cachedPlayers.find((player) => player.id === selectedId);
  if (!selected) return;
  const password = playerPassword.value.trim();
  if (!password) {
    alert("Ingresa la clave del jugador.");
    return;
  }
  const desiredStatus = selected.status === "Active" ? "Inactive" : "Active";
  playerToggleBtn.disabled = true;
  try {
    const response = await fetch("/.netlify/functions/players-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: selected.id,
        desiredStatus,
        password,
      }),
    });
    if (!response.ok) {
      throw new Error("update failed");
    }
    const result = await response.json();
    cachedPlayers = cachedPlayers.map((player) =>
      player.id === selected.id ? { ...player, status: result.status } : player
    );
    playerPassword.value = "";
    updateMetaUI();
  } catch (error) {
    alert("Clave incorrecta o no se pudo actualizar el estado.");
  } finally {
    playerToggleBtn.disabled = false;
  }
});

audioToggle.addEventListener("change", () => {
  audioEnabled = audioToggle.checked;
  meta.audioEnabled = audioEnabled;
  saveMeta();
  if (audioEnabled) {
    playSound("toggle");
  }
});

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch (error) {
    return {};
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadMeta() {
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch (error) {
    return {};
  }
}

function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function updateMetaUI() {
  const now = new Date();
  weekdayLabel.textContent = formatFullDate(now);
  const currentPlayer = meta.player || DEFAULT_PLAYER;
  playerLabel.textContent = currentPlayer;
  if (playerSelect.options.length) {
    const found = cachedPlayers.find((player) => player.name === currentPlayer);
    if (found) {
      playerSelect.value = found.id;
      playerStatus.textContent = found.status === "Active" ? "Activo" : "Inactivo";
      playerStatus.classList.toggle("inactive", found.status !== "Active");
      playerToggleBtn.textContent = found.status === "Active" ? "Desactivar" : "Activar";
    } else {
      playerSelect.value = playerSelect.options[0]?.value || "";
      playerStatus.textContent = "Activo";
      playerStatus.classList.remove("inactive");
      playerToggleBtn.textContent = "Desactivar";
    }
  }
  const isAuthed = authenticatedPlayerId && playerSelect.value === authenticatedPlayerId;
  playerLoginBtn.textContent = isAuthed ? "Validado" : "Ingresar";
  playerLoginBtn.disabled = isAuthed;
  document.body.classList.toggle("locked", !isAuthed);
  audioToggle.checked = Boolean(audioEnabled);
}

function render() {
  questBoard.innerHTML = "";

  const allTasksFlat = [];
  questData.forEach((s) => s.tasks.forEach((t) => allTasksFlat.push(t)));
  let firstIncompleteIdx = allTasksFlat.findIndex((t) => !state[t.id]?.completed);
  if (firstIncompleteIdx === -1) firstIncompleteIdx = allTasksFlat.length;

  questData.forEach((section) => {
    const sectionEl = document.createElement("div");
    sectionEl.className = "section";

    const titleEl = document.createElement("div");
    titleEl.className = "section-title";
    titleEl.innerHTML = `<span>${section.icon}</span> ${section.title}`;
    sectionEl.appendChild(titleEl);

    const taskGrid = document.createElement("div");
    taskGrid.className = "task-grid";

    section.tasks.forEach((task) => {
      const taskEl = document.createElement("div");
      taskEl.className = "task";

      const completed = Boolean(state[task.id]?.completed);
      if (completed) taskEl.classList.add("completed");

      const taskFlatIdx = allTasksFlat.indexOf(task);
      const isLocked = taskFlatIdx > firstIncompleteIdx;
      if (isLocked) taskEl.classList.add("locked");

      const monsterEl = document.createElement("div");
      monsterEl.className = "monster";
      monsterEl.textContent = task.monster;

      const weaponCfg = WEAPON_CONFIG[task.weapon] || WEAPON_CONFIG.cannon;
      const weaponBadge = document.createElement("div");
      weaponBadge.className = "weapon-badge";
      weaponBadge.textContent = isLocked ? "🔒" : weaponCfg.emoji;
      monsterEl.style.position = "relative";
      monsterEl.appendChild(weaponBadge);

      const infoEl = document.createElement("div");
      infoEl.className = "task-info";

      const title = document.createElement("div");
      title.className = "task-title";
      title.textContent = task.title;

      const hp = document.createElement("div");
      hp.className = "hp";
      const hpBar = document.createElement("div");
      hpBar.className = "hp-bar";
      hpBar.style.width = `${calculateHp(task)}%`;
      hp.appendChild(hpBar);

      infoEl.appendChild(title);
      infoEl.appendChild(hp);

      if (task.subtasks?.length) {
        const subs = document.createElement("div");
        subs.className = "subtasks";
        task.subtasks.forEach((sub) => {
          const subEl = document.createElement("label");
          subEl.className = "subtask";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = Boolean(state[sub.id]?.completed);
          input.addEventListener("change", () => {
            if (!isPlayerAuthenticated()) {
              input.checked = false;
              alert("Primero valida la clave del jugador.");
              return;
            }
            state[sub.id] = { completed: input.checked };
            saveState();
            if (isSectionComplete(section)) {
              sendToAirtable({
                type: "section",
                sectionTitle: section.title,
                completed: true,
              });
            }
            if (input.checked) {
              playWeaponSound(task.weapon || "cannon");
              spawnProjectile(taskEl, task.weapon || "cannon");
              setTimeout(() => { render(); updateStats(); }, 1100);
            } else {
              render();
              updateStats();
            }
          });
          const span = document.createElement("span");
          span.textContent = sub.title;
          subEl.appendChild(input);
          subEl.appendChild(span);
          subs.appendChild(subEl);
        });
        infoEl.appendChild(subs);
      }

      if (task.type === "note") {
        const note = document.createElement("textarea");
        note.className = "note-box";
        note.placeholder = "Escribe aqui...";
        note.value = state[task.id]?.note || "";
        note.addEventListener("input", () => {
          if (!isPlayerAuthenticated()) {
            note.value = state[task.id]?.note || "";
            alert("Primero valida la clave del jugador.");
            return;
          }
          state[task.id] = {
            ...(state[task.id] || {}),
            note: note.value,
          };
          saveState();
          if (noteDebounce) clearTimeout(noteDebounce);
          noteDebounce = setTimeout(() => {
            sendToAirtable({
              type: "note",
              taskId: task.id,
              taskTitle: task.title,
              note: note.value,
            });
          }, 800);
        });
        infoEl.appendChild(note);
      }

      const actionEl = document.createElement("div");
      actionEl.className = "task-actions";

      const checkLabel = document.createElement("label");
      checkLabel.className = "check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = completed;
      input.addEventListener("change", () => {
        if (!isPlayerAuthenticated()) {
          input.checked = completed;
          alert("Primero valida la clave del jugador.");
          return;
        }
        state[task.id] = {
          ...(state[task.id] || {}),
          completed: input.checked,
        };
        saveState();
        if (isSectionComplete(section)) {
          sendToAirtable({
            type: "section",
            sectionTitle: section.title,
            completed: true,
          });
        }
        if (input.checked) {
          playWeaponSound(task.weapon || "cannon");
          spawnProjectile(taskEl, task.weapon || "cannon");
          setTimeout(() => { render(); updateStats(); }, 1100);
        } else {
          playSound("undo");
          render();
          updateStats();
        }
      });
      const checkText = document.createElement("span");
      checkText.textContent = completed ? "Derrotado" : "En combate";
      checkLabel.appendChild(input);
      checkLabel.appendChild(checkText);

      const treasure = document.createElement("div");
      treasure.className = "treasure";
      treasure.textContent = task.treasure || "💰";

      actionEl.appendChild(checkLabel);
      actionEl.appendChild(treasure);

      taskEl.appendChild(monsterEl);
      taskEl.appendChild(infoEl);
      taskEl.appendChild(actionEl);

      taskGrid.appendChild(taskEl);
    });

    sectionEl.appendChild(taskGrid);
    questBoard.appendChild(sectionEl);
  });
}

function calculateHp(task) {
  const subTotal = task.subtasks?.length || 0;
  const subCompleted = task.subtasks
    ? task.subtasks.filter((sub) => state[sub.id]?.completed).length
    : 0;
  const mainCompleted = state[task.id]?.completed ? 1 : 0;
  const total = subTotal + 1;
  const hits = subCompleted + mainCompleted;
  const hp = Math.max(0, 100 - Math.round((hits / total) * 100));
  return hp;
}

function updateStats() {
  const totals = countTotals();
  const progress = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;

  progressEl.textContent = `${progress}%`;
  progressFill.style.width = `${progress}%`;
  completedCountEl.textContent = totals.completed;
  totalCountEl.textContent = totals.total;

  const xp = totals.completed * 120;
  const level = Math.max(1, Math.floor(xp / 500) + 1);

  xpEl.textContent = xp;
  levelEl.textContent = level;

  if (totals.total > 0 && totals.completed === totals.total) {
    startCelebration();
  }
}

function countTotals() {
  let total = 0;
  let completed = 0;

  questData.forEach((section) => {
    section.tasks.forEach((task) => {
      total += 1;
      if (state[task.id]?.completed) completed += 1;
      if (task.subtasks?.length) {
        task.subtasks.forEach((sub) => {
          total += 1;
          if (state[sub.id]?.completed) completed += 1;
        });
      }
    });
  });

  return { total, completed };
}

function startCelebration() {
  if (celebration.classList.contains("active")) return;
  celebration.classList.add("active");
  launchConfetti();
  fireworksEngine = startFireworks(fireworksCanvas);
  playSound("celebration");
}

function stopCelebration() {
  celebration.classList.remove("active");
  confetti.innerHTML = "";
  if (fireworksEngine) {
    fireworksEngine.stop();
    fireworksEngine = null;
  }
}

function isSectionComplete(section) {
  return section.tasks.every((task) => {
    if (!state[task.id]?.completed) return false;
    if (task.subtasks?.length) {
      return task.subtasks.every((sub) => state[sub.id]?.completed);
    }
    return true;
  });
}

function launchConfetti() {
  confetti.innerHTML = "";
  const colors = ["#5cf2ff", "#5cff9e", "#f9b84a", "#ff5c78", "#9b7bff"];
  const count = 120;

  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.background = colors[i % colors.length];
    piece.style.transform = `translateY(-10vh) rotate(${Math.random() * 360}deg)`;
    piece.style.width = `${6 + Math.random() * 6}px`;
    piece.style.height = `${10 + Math.random() * 8}px`;
    confetti.appendChild(piece);
  }
}

function isPlayerAuthenticated() {
  return authenticatedPlayerId && playerSelect.value === authenticatedPlayerId;
}

function formatFullDate(date) {
  const weekday = WEEKDAYS[date.getDay()];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = date.getDate();
  const year = date.getFullYear();
  const suffix =
    day % 10 === 1 && day % 100 !== 11
      ? "st"
      : day % 10 === 2 && day % 100 !== 12
      ? "nd"
      : day % 10 === 3 && day % 100 !== 13
      ? "rd"
      : "th";
  return `${weekday}: ${months[date.getMonth()]} ${day}${suffix}, ${year}`;
}
function spawnProjectile(container, weapon) {
  const config = WEAPON_CONFIG[weapon] || WEAPON_CONFIG.cannon;
  container.style.position = "relative";
  container.style.overflow = "visible";

  // Phase 1: Projectile flies from right (checkbox) to left (monster)
  const projectile = document.createElement("div");
  projectile.className = "projectile";
  projectile.textContent = config.emoji;
  projectile.style.setProperty("--proj-color", config.colors[0]);
  container.appendChild(projectile);

  // Phase 2: Explosion at the monster after projectile arrives
  setTimeout(() => {
    projectile.remove();

    const flash = document.createElement("div");
    flash.className = "explosion-flash";
    flash.style.background = config.colors[0];
    container.appendChild(flash);

    const particleCount = 14;
    for (let i = 0; i < particleCount; i += 1) {
      const particle = document.createElement("div");
      particle.className = "explosion-particle";
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 35 + Math.random() * 35;
      particle.style.setProperty("--ex", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--ey", `${Math.sin(angle) * distance}px`);
      particle.style.background = config.colors[i % 2];
      particle.style.width = `${5 + Math.random() * 6}px`;
      particle.style.height = particle.style.width;
      container.appendChild(particle);
    }

    setTimeout(() => {
      flash.remove();
      container.querySelectorAll(".explosion-particle").forEach((p) => p.remove());
    }, 650);
  }, 500);
}

function playWeaponSound(weapon) {
  if (!audioEnabled) return;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;

  if (weapon === "cannon") {
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    noise.connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.25);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (weapon === "arrow") {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (weapon === "laser") {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (weapon === "rocket") {
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.15);
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (weapon === "magic") {
    const freqs = [523, 659, 784];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.3);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02 + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.35);
    });
  }
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playSound(type) {
  if (!audioEnabled) return;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "triangle";
  const now = ctx.currentTime;
  const settings = {
    complete: { freq: 520, duration: 0.18 },
    subtask: { freq: 420, duration: 0.12 },
    undo: { freq: 220, duration: 0.12 },
    reset: { freq: 180, duration: 0.2 },
    celebration: { freq: 640, duration: 0.3 },
    toggle: { freq: 360, duration: 0.08 },
  };
  const { freq, duration } = settings[type] || settings.complete;
  oscillator.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

async function sendToAirtable(payload) {
  try {
    const now = new Date();
    const body = {
      ...payload,
      player: meta.player || DEFAULT_PLAYER,
      dayOfWeek: WEEKDAYS[now.getDay()],
      dateISO: now.toISOString(),
    };
    await fetch("/.netlify/functions/airtable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Silent fail for offline/local usage
  }
}

async function loadPlayers() {
  playerSelect.innerHTML = "";
  const loading = document.createElement("option");
  loading.textContent = "Cargando...";
  loading.value = "";
  playerSelect.appendChild(loading);

  try {
    const response = await fetch("/.netlify/functions/players");
    if (!response.ok) throw new Error("players fetch failed");
    const data = await response.json();
    cachedPlayers = Array.isArray(data.players) ? data.players : [];
  } catch (error) {
    cachedPlayers = [];
  }

  const players = cachedPlayers.length ? cachedPlayers : [{ id: "local", name: DEFAULT_PLAYER, status: "Active" }];
  if (!cachedPlayers.length) {
    cachedPlayers = players;
  }
  playerSelect.innerHTML = "";
  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.name;
    playerSelect.appendChild(option);
  });

  const names = players.map((player) => player.name);
  if (!meta.player || !names.includes(meta.player)) {
    meta.player = players[0]?.name || DEFAULT_PLAYER;
    saveMeta();
  }
  updateMetaUI();
}

function startFireworks(canvas) {
  const ctx = canvas.getContext("2d");
  let width = (canvas.width = canvas.offsetWidth);
  let height = (canvas.height = canvas.offsetHeight);
  let running = true;

  const particles = [];
  const colors = ["#5cf2ff", "#5cff9e", "#f9b84a", "#ff5c78", "#9b7bff"];

  function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  }

  window.addEventListener("resize", resize);

  function spawnFirework() {
    const x = Math.random() * width * 0.8 + width * 0.1;
    const y = Math.random() * height * 0.4 + height * 0.1;
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < 50; i += 1) {
      const angle = (Math.PI * 2 * i) / 50;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
      });
    }
  }

  let lastSpawn = 0;

  function tick(timestamp) {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    if (timestamp - lastSpawn > 500) {
      spawnFirework();
      lastSpawn = timestamp;
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.alpha -= 0.015;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  return {
    stop() {
      running = false;
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, width, height);
    },
  };
}
