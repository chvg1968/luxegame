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
      },
      {
        id: "morning-2",
        title: "Review the calendar for arrivals today and tomorrow.",
        monster: "🐉",
        treasure: "💎",
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
        title: "Schedule and/or send check-in (CI) OK messages to today’s arrivals at their confirmed check-in time.",
        monster: "🧟",
        treasure: "🪙",
      },
      {
        id: "arrival-2",
        title: "Schedule and/or send 5-star review messages after the guests’ confirmed check-out time for those checking out today.",
        monster: "🦑",
        treasure: "🏆",
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
      },
      {
        id: "reserv-2",
        title: "Review future month reservations.",
        monster: "🐲",
        treasure: "💎",
      },
      {
        id: "reserv-3",
        title: "Follow up to complete missing checkmarks and get reservations marked in yellow.",
        monster: "🧠",
        treasure: "🗝️",
      },
    ],
  },
  {
    title: "Afternoon Tasks",
    icon: "🌇",
    tasks: [
      {
        id: "after-1",
        title: "Send to the group chat the next day’s check-in and check-out times for each villa.",
        monster: "🦅",
        treasure: "🪙",
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
        type: "note",
      },
    ],
  },
];

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
const playerToggleBtn = document.getElementById("playerToggleBtn");
const audioToggle = document.getElementById("audioToggle");

let fireworksEngine = null;
let audioContext = null;
let audioEnabled = meta.audioEnabled ?? true;
let noteDebounce = null;
let cachedPlayers = [];

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
  saveMeta();
  updateMetaUI();
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
  weekdayLabel.textContent = WEEKDAYS[now.getDay()];
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
  audioToggle.checked = Boolean(audioEnabled);
}

function render() {
  questBoard.innerHTML = "";

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

      const monsterEl = document.createElement("div");
      monsterEl.className = "monster";
      monsterEl.textContent = task.monster;

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
            state[sub.id] = { completed: input.checked };
            saveState();
            if (input.checked) {
              playSound("subtask");
              spawnImpact(taskEl);
            }
            sendToAirtable({
              type: "subtask",
              taskId: task.id,
              taskTitle: task.title,
              subtaskId: sub.id,
              subtaskTitle: sub.title,
              completed: input.checked,
            });
            render();
            updateStats();
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
        state[task.id] = {
          ...(state[task.id] || {}),
          completed: input.checked,
        };
        saveState();
        if (input.checked) {
          playSound("complete");
          spawnImpact(taskEl);
        } else {
          playSound("undo");
        }
        sendToAirtable({
          type: "task",
          taskId: task.id,
          taskTitle: task.title,
          completed: input.checked,
        });
        render();
        updateStats();
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

function spawnImpact(container) {
  const ring = document.createElement("div");
  ring.className = "impact-ring";
  container.appendChild(ring);
  const sparks = 8;
  for (let i = 0; i < sparks; i += 1) {
    const spark = document.createElement("div");
    spark.className = "spark";
    const angle = (Math.PI * 2 * i) / sparks;
    const distance = 24 + Math.random() * 18;
    spark.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
    spark.style.background = i % 2 === 0 ? "#5cff9e" : "#5cf2ff";
    container.appendChild(spark);
  }
  setTimeout(() => {
    ring.remove();
    container.querySelectorAll(".spark").forEach((spark) => spark.remove());
  }, 900);
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
