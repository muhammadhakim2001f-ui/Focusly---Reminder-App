const API_URL = "/api";
let mediaRecorder;
let audioChunks = [];
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const AppState = {
  token: localStorage.getItem("token"),
  user: null,
  tasks: [],
  habits: [],
  goals: [],
  projects: [],
  notifications: [],
  selectedDate: new Date(),
  timer: { timeLeft: 25 * 60, totalTime: 25 * 60, isRunning: false, activeTaskId: null, interval: null },
};

try {
  AppState.user = JSON.parse(localStorage.getItem("user"));
} catch (e) {
  localStorage.clear();
}

// --- AUDIO UNLOCKER ---
function unlockAudio() {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const buffer = audioCtx.createBuffer(1, 1, 22050);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
}
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("DOMContentLoaded", init);

async function init() {
  if (AppState.token && AppState.user) {
    try {
      await fetchAllData();
      renderDashboard();
      setInterval(checkAlarms, 30000);
    } catch (e) {
      console.error(e);
      logout();
    }
  } else {
    renderLogin();
  }
  if (window.lucide) lucide.createIcons();
}

async function fetchAllData() {
  const headers = { Authorization: `Bearer ${AppState.token}` };
  const get = async (u) => (await fetch(API_URL + u, { headers })).json();
  try {
    const [t, h, g, p, n] = await Promise.all([get("/tasks"), get("/habits"), get("/goals"), get("/projects"), get("/notifications")]);
    AppState.tasks = t || [];
    AppState.habits = h || [];
    AppState.goals = g || [];
    AppState.projects = p || [];
    AppState.notifications = n || [];
  } catch (e) {
    console.log(e);
  }
}

// --- AUTH ---
function renderLogin() {
  document.getElementById("app").innerHTML = `
    <div class="auth-wrapper">
        <div class="auth-card">
            <h1>Focusly</h1>
            <p style="opacity:0.9;margin-bottom:2rem">Productivity Evolved.</p>
            <!-- Perubahan: Menambahkan atribut name pada input -->
            <form onsubmit="auth(event, '/auth/login')">
                <input class="input" name="email" placeholder="Email" type="email" required>
                <input class="input" name="password" placeholder="Password" type="password" required>
                <button class="btn btn-primary w-full mt-4">Login</button>
                <div class="mt-4 cursor-pointer" onclick="renderSignup()">Create Account</div>
            </form>
        </div>
    </div>`;
}

function renderSignup() {
  document.getElementById("app").innerHTML = `
    <div class="auth-wrapper">
        <div class="auth-card">
            <h1>Join Us</h1>
            <p style="opacity:0.9;margin-bottom:2rem">Start your journey.</p>
            <!-- Perubahan: Menambahkan atribut name pada input -->
            <form onsubmit="auth(event, '/auth/signup', true)">
                <input class="input" name="name" placeholder="Name" required>
                <input class="input" name="email" placeholder="Email" type="email" required>
                <input class="input" name="password" placeholder="Password" type="password" required>
                <button class="btn btn-primary w-full mt-4">Sign Up</button>
                <div class="mt-4 cursor-pointer" onclick="renderLogin()">Login</div>
            </form>
        </div>
    </div>`;
}

async function auth(e, endpoint, isSignup = false) {
  e.preventDefault();

  // Perbaikan: Menggunakan FormData agar data akurat di Chrome
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(API_URL + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (res.ok) {
      if (isSignup) {
        alert("Account created successfully! Please login.");
        renderLogin();
      } else {
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        location.reload(); // Refresh halaman untuk masuk ke dashboard
      }
    } else {
      alert(result.error || "Authentication failed");
    }
  } catch (error) {
    console.error("Auth Error:", error);
    alert("Cannot connect to server. Ensure backend is running.");
  }
}

// --- NAVBAR ---
function renderNavbar(act) {
  const unread = AppState.notifications.filter((n) => !n.read).length;
  return `<nav class="navbar"><div class="nav-container">
        <div style="font-weight:800;color:var(--primary);font-size:1.4rem">Focusly.</div>
        <div class="flex gap-4">
            <div class="nav-item ${act == "dashboard" ? "active" : ""}" onclick="renderDashboard()">Dash</div>
            <div class="nav-item ${act == "focus" ? "active" : ""}" onclick="renderFocusMode()">Focus</div>
            <div class="nav-item ${act == "habits" ? "active" : ""}" onclick="renderHabits()">Habits</div>
            <div class="nav-item ${act == "goals" ? "active" : ""}" onclick="renderGoals()">Goals</div>
            <div class="nav-item ${act == "team" ? "active" : ""}" onclick="renderTeam()">Team</div>
            <div class="notif-wrapper" onclick="togNotif()">
                <i data-lucide="bell" style="color:${unread ? "var(--danger)" : "var(--text-light)"}"></i>
                ${unread > 0 ? `<div class="notif-badge">${unread}</div>` : ""}
                <div id="notif-box" class="notif-dropdown hidden" onclick="event.stopPropagation()">
                    ${
                      AppState.notifications.length
                        ? AppState.notifications
                            .slice(0, 5)
                            .map((n) => `<div class="notif-item ${!n.read ? "unread" : ""}"><div style="font-weight:bold;font-size:0.85rem">${n.title}</div><div style="font-size:0.8rem;color:var(--text-light)">${n.message}</div></div>`)
                            .join("")
                        : '<div style="padding:1rem;text-align:center;color:gray">No notifications</div>'
                    }
                </div>
            </div>
            <i data-lucide="log-out" onclick="logout()" style="cursor:pointer; color:var(--text-light)"></i>
        </div>
    </div></nav>`;
}
function togNotif() {
  const box = document.getElementById("notif-box");
  box.classList.toggle("hidden");
  if (!box.classList.contains("hidden") && AppState.notifications.some((n) => !n.read)) {
    fetch(API_URL + "/notifications/read", { method: "PUT", headers: { Authorization: `Bearer ${AppState.token}` } });
    AppState.notifications.forEach((n) => (n.read = true));
    document.querySelector(".notif-badge")?.remove();
  }
}

// --- DASHBOARD (FIXED CALENDAR & LOCATION & IMAGE) ---
function renderDashboard() {
  const todayStr = AppState.selectedDate.toDateString();
  let tasks = (AppState.tasks || []).filter((t) => t.date && new Date(t.date).toDateString() === todayStr);
  tasks.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

  document.getElementById("app").innerHTML = `
        ${renderNavbar("dashboard")}
        <div class="container mt-4">
            <div class="flex justify-between mb-4 items-end">
                <div><h1>Hello, ${AppState.user?.name.split(" ")[0]}!</h1><p class="text-light">${todayStr}</p></div>
                <button class="btn btn-primary" onclick="openAddTaskModal()">+ New Task</button>
            </div>
            <div class="grid-responsive">
                <div class="app-card flex gap-4 items-center"><div style="background:#e0e7ff;padding:12px;border-radius:12px;color:var(--primary)"><i data-lucide="check-circle"></i></div><div><h3>${
                  AppState.tasks.filter((t) => t.completed).length
                }</h3><p class="text-sm text-light">Completed</p></div></div>
                <div class="app-card flex gap-4 items-center"><div style="background:#ffedd5;padding:12px;border-radius:12px;color:var(--warning)"><i data-lucide="flame"></i></div><div><h3>${
                  AppState.user?.streak || 0
                }</h3><p class="text-sm text-light">Streak</p></div></div>
                <div class="app-card flex gap-4 items-center"><div style="background:#ccfbf1;padding:12px;border-radius:12px;color:var(--secondary)"><i data-lucide="star"></i></div><div><h3>${
                  AppState.user?.exp || 0
                } XP</h3><p class="text-sm text-light">Level ${Math.floor((AppState.user?.exp || 0) / 100) + 1}</p></div></div>
            </div>
            <div class="app-card mb-4">
                <h3 class="mb-4 text-center">${AppState.selectedDate.toLocaleString("default", { month: "long", year: "numeric" })}</h3>
                <div class="calendar-grid">
                    ${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<div style="font-weight:bold;color:#94a3b8;margin-bottom:5px">${d}</div>`).join("")}
                    ${generateCalendarHTML()}
                </div>
            </div>
            <div id="task-list">
                <h3 class="mb-4">Tasks for Today</h3>
                ${tasks.length ? tasks.map((t) => renderTaskItem(t)).join("") : '<div class="app-card" style="text-align:center;color:#94a3b8">No tasks scheduled.</div>'}
            </div>
        </div>`;
  lucide.createIcons();
}

function generateCalendarHTML() {
  const d = AppState.selectedDate,
    y = d.getFullYear(),
    m = d.getMonth();
  const fd = new Date(y, m, 1).getDay(),
    dim = new Date(y, m + 1, 0).getDate();
  let h = "";
  for (let i = 0; i < fd; i++) h += "<div></div>";
  for (let i = 1; i <= dim; i++) {
    const dateStr = new Date(y, m, i).toDateString();
    const tasks = AppState.tasks.filter((t) => new Date(t.date).toDateString() === dateStr);
    let dots = "";
    // --- FIX LOGIKA DOTS ---
    if (tasks.some((t) => t.priority === "high")) dots += `<div class="dot" style="background:var(--danger)"></div>`;
    if (tasks.some((t) => t.priority === "medium")) dots += `<div class="dot" style="background:var(--warning)"></div>`;
    if (tasks.some((t) => t.priority === "low")) dots += `<div class="dot" style="background:var(--success)"></div>`;
    // -----------------------
    const isSel = i === d.getDate();
    const isToday = new Date().toDateString() === dateStr;
    let style = isToday ? "border:2px solid var(--primary)" : "";
    h += `<div class="cal-day ${isSel ? "selected" : ""}" style="${style}" onclick="AppState.selectedDate.setDate(${i});renderDashboard()">${i}<div class="dots">${dots}</div></div>`;
  }
  return h;
}

function renderTaskItem(t) {
  // --- FIX: GOOGLE MAPS LINK ---
  const locationHtml = t.location
    ? `<a href="https://maps.google.com/?q=${encodeURIComponent(t.location)}" target="_blank" onclick="event.stopPropagation()" class="flex gap-1 hover:underline" style="color:var(--text-light)"><i data-lucide="map-pin" size="14"></i> ${
        t.location
      }</a>`
    : "";

  return `
    <div class="app-card" style="margin-bottom:1rem">
        <div class="task-layout">
            <div style="flex:1">
                <div class="flex gap-3 items-start">
                    <div style="cursor:pointer; color:${t.completed ? "#10b981" : "#cbd5e1"}; margin-top:3px" onclick="toggleTask('${t._id}', ${!t.completed})"><i data-lucide="${t.completed ? "check-circle" : "circle"}"></i></div>
                    <div>
                        <h3 style="${t.completed ? "text-decoration:line-through;color:#94a3b8" : ""}">${t.title}</h3>
                        <div class="flex gap-3 text-sm text-light flex-wrap mt-2">
                            <span style="font-weight:700;color:${t.priority === "high" ? "var(--danger)" : t.priority === "medium" ? "var(--warning)" : "var(--success)"}">${t.priority.toUpperCase()}</span>
                            ${t.time ? `<span>⏰ ${t.time}</span>` : ""}
                            ${locationHtml}
                            ${t.voiceNoteUrl ? `<span class="cursor-pointer" style="color:var(--primary)" onclick="playAudio(event,'${t.voiceNoteUrl}')">🔊 VN</span>` : ""}
                            ${!t.completed ? `<span class="cursor-pointer" style="color:var(--primary);font-weight:600" onclick="startFocusSession('${t._id}')">▶ Focus</span>` : ""}
                        </div>
                    </div>
                </div>
            </div>
            ${t.imageUrl ? `<img src="${API_URL}${t.imageUrl}" class="task-thumb" onclick="openLightbox('${API_URL}${t.imageUrl}')" title="Zoom">` : ""}
        </div>
    </div>`;
}

// --- LIGHTBOX GLOBAL (Fix Preview) ---
window.openLightbox = function (url) {
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `<img src="${url}" onclick="event.stopPropagation()">`;
  lb.onclick = () => lb.remove();
  document.body.appendChild(lb);
};

// --- FOCUS MODE (NO ALERT) ---
function startFocusSession(taskId) {
  AppState.timer.activeTaskId = taskId;
  renderFocusMode();
}
function renderFocusMode() {
  const activeTask = AppState.tasks.find((t) => t._id === AppState.timer.activeTaskId);
  document.getElementById("app").innerHTML = `
    ${renderNavbar("focus")}
    <div class="focus-container">
        <div class="timer-card" style="${document.fullscreenElement ? "background:transparent;box-shadow:none" : ""}">
            <h2 class="mb-4" style="text-align:center">${activeTask ? activeTask.title : "Focus Session"}</h2>
            <div class="timer-wrapper">
                <svg class="timer-svg">
                    <circle cx="150" cy="150" r="140" class="timer-bg"></circle>
                    <circle cx="150" cy="150" r="140" class="timer-path" id="tp"></circle>
                </svg>
                <div class="timer-text" id="tt">${formatTime(AppState.timer.timeLeft)}</div>
            </div>
            ${
              !document.fullscreenElement
                ? `
            <div class="flex justify-center gap-2 mt-4">
                <button class="btn btn-outline btn-sm" onclick="setT(25)">25m</button>
                <button class="btn btn-outline btn-sm" onclick="setT(5)">5m</button>
                <input type="number" class="input" style="width:70px;margin:0;text-align:center" placeholder="Min" onchange="setT(this.value)">
            </div>`
                : ""
            }
            <div class="controls-area flex justify-center gap-4 mt-4">
                <button id="fb" class="btn btn-primary" style="padding:1rem 3rem;font-size:1.2rem" onclick="togF()">Start Focus</button>
                ${!document.fullscreenElement ? `<button class="btn btn-outline" style="padding:1rem 2rem;font-size:1.2rem" onclick="resF()">Reset</button>` : ""}
            </div>
        </div>
    </div>`;
  lucide.createIcons();
  updF();
}
function setT(m) {
  AppState.timer.timeLeft = m * 60;
  AppState.timer.totalTime = m * 60;
  updF();
}
function togF() {
  if (!AppState.timer.isRunning) {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    AppState.timer.isRunning = true;
    document.getElementById("fb").textContent = "Pause";
    document.getElementById("fb").style.background = "#ef4444";
    AppState.timer.interval = setInterval(() => {
      AppState.timer.timeLeft--;
      updF();
      if (AppState.timer.timeLeft <= 0) finishTimer();
    }, 1000);
  } else {
    clearInterval(AppState.timer.interval);
    AppState.timer.isRunning = false;
    document.getElementById("fb").textContent = "Resume";
    document.getElementById("fb").style.background = "var(--primary)";
  }
}
function finishTimer() {
  clearInterval(AppState.timer.interval);

  // 1. Play Audio
  if (AppState.timer.activeTaskId) {
    const task = AppState.tasks.find((t) => t._id === AppState.timer.activeTaskId);
    if (task && task.voiceNoteUrl) new Audio(API_URL + task.voiceNoteUrl).play();
    else new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3").play();
  } else new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3").play();

  // 2. Exit Fullscreen (NO ALERT)
  if (document.fullscreenElement) document.exitFullscreen();

  // 3. Update XP & UI
  updateExp(50, "Focus Session");
  showToast("TIME IS UP! Great Job! 🎉");
  resF();
}
function resF() {
  clearInterval(AppState.timer.interval);
  AppState.timer.isRunning = false;
  AppState.timer.timeLeft = AppState.timer.totalTime;
  renderFocusMode();
}
function updF() {
  if (document.getElementById("tt")) {
    document.getElementById("tt").textContent = formatTime(AppState.timer.timeLeft);
    const offset = 880 * (1 - AppState.timer.timeLeft / AppState.timer.totalTime);
    document.getElementById("tp").style.strokeDashoffset = offset;
  }
}

// --- MODULES LAIN ---
function renderHabits() {
  document.getElementById("app").innerHTML = `${renderNavbar("habits")}
    <div class="container mt-4"><div class="flex justify-between mb-4"><h2>Habits</h2><button class="btn btn-primary" onclick="openHabitModal()">+ New Habit</button></div>
    <div class="grid-responsive">${AppState.habits
      .map(
        (h) => `
        <div class="app-card">
            <div class="flex justify-between mb-4"><div class="flex gap-3"><div style="width:40px;height:40px;background:${h.color};border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem">${
          h.icon
        }</div><div><h4>${h.name}</h4><small>${h.frequency}</small></div></div><div style="font-weight:bold;color:var(--danger)">🔥 ${h.streak}</div></div>
            <div class="flex justify-between">${["M", "T", "W", "T", "F", "S", "S"]
              .map(
                (d, i) =>
                  `<div style="width:30px;height:30px;border-radius:8px;background:${i < h.streak % 7 ? h.color : "#f1f5f9"};color:${
                    i < h.streak % 7 ? "white" : "#94a3b8"
                  };display:flex;align-items:center;justify-content:center;font-size:0.75rem;cursor:pointer" onclick="checkHabit('${h._id}')">${d}</div>`
              )
              .join("")}</div>
        </div>`
      )
      .join("")}</div></div>`;
  lucide.createIcons();
}
function renderGoals() {
  document.getElementById("app").innerHTML = `${renderNavbar("goals")}
    <div class="container mt-4"><div class="flex justify-between mb-4"><h2>Goals</h2><button class="btn btn-primary" onclick="openGoalModal()">+ New Goal</button></div>
    <div class="grid-responsive">${AppState.goals
      .map(
        (g) => `
        <div class="app-card">
            <div class="flex justify-between mb-2"><h4>${g.title}</h4><span class="text-sm bg-gray-100 p-1 rounded font-bold" style="color:var(--primary)">${g.category}</span></div>
            <p class="text-sm text-light mb-4">${g.description || ""}</p>
            <div class="flex justify-between text-sm font-bold mb-1"><span>Progress</span><span>${Math.round(g.progress)}%</span></div>
            <div style="background:#f1f5f9;height:8px;border-radius:4px;overflow:hidden;margin-bottom:1rem"><div style="width:${g.progress}%;height:100%;background:var(--primary)"></div></div>
            <div>${g.milestones
              .map(
                (m, i) =>
                  `<div class="flex gap-2 mb-2 text-sm items-center"><input type="checkbox" ${m.completed ? "checked" : ""} onchange="toggleMilestone('${g._id}',${i})"> <span style="${
                    m.completed ? "text-decoration:line-through;color:#94a3b8" : ""
                  }">${m.text}</span></div>`
              )
              .join("")}</div>
        </div>`
      )
      .join("")}</div></div>`;
  lucide.createIcons();
}
// --- TEAM MODULE (FIXED AVATAR) ---
function renderTeam() {
  // Fungsi kecil untuk generate warna pastel berdasarkan nama user
  const getColor = (str) => {
    const colors = ["#e0e7ff", "#ffedd5", "#ccfbf1", "#fce7f3", "#fae8ff", "#fee2e2"];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  document.getElementById("app").innerHTML = `${renderNavbar("team")}
    <div class="container mt-4">
        <div class="flex justify-between mb-4 items-end">
            <h2>Projects</h2>
            <button class="btn btn-primary" onclick="openProjectModal()">+ New Project</button>
        </div>
        
        <div class="grid-responsive">
            ${AppState.projects
              .map(
                (p) => `
            <div class="app-card" style="border-top: 5px solid ${p.color}">
                <div class="flex justify-between mb-2">
                    <h3 style="font-size:1.2rem; font-weight:700">${p.name}</h3>
                    <button class="btn btn-sm btn-outline" style="border-radius:20px; font-size:0.75rem" onclick="openInvite('${p._id}')">
                        <i data-lucide="user-plus" size="14"></i> Invite
                    </button>
                </div>
                
                <div class="mb-4">
                    <p class="text-sm font-bold text-light mb-1">Members</p>
                    <div class="member-stack">
                        <!-- Avatar User Sendiri (You) -->
                        <div class="member-avatar" title="You (${AppState.user.email})" style="background:${p.color}; color:white; border-color:white">ME</div>
                        
                        <!-- Avatar Member Lain -->
                        ${p.members
                          .map(
                            (m) => `
                            <div class="member-avatar" title="${m}" style="background:${getColor(m)}">
                                ${m.substring(0, 2).toUpperCase()}
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>

                <div class="mb-4" style="background:#f8fafc; border-radius:12px; padding:1rem; border:1px solid #f1f5f9">
                    <div class="flex justify-between mb-2">
                        <span class="text-sm font-bold text-light">Tasks</span>
                        <span class="text-sm font-bold text-primary">${p.tasks.filter((t) => t.completed).length}/${p.tasks.length}</span>
                    </div>
                    ${
                      p.tasks.length
                        ? p.tasks
                            .map(
                              (t, i) => `
                        <div class="flex justify-between text-sm mb-2 p-2 bg-white rounded border items-center">
                            <div class="flex gap-2" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                <input type="checkbox" ${t.completed ? "checked" : ""} onchange="toggleProjectTask('${p._id}',${i})"> 
                                <span style="${t.completed ? "text-decoration:line-through;color:#ccc" : ""}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px">${t.title}</span>
                            </div>
                            <div class="text-right flex-shrink-0">
                                <small class="text-primary font-bold" style="font-size:0.7rem">${t.deadline ? new Date(t.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</small>
                            </div>
                        </div>`
                            )
                            .join("")
                        : '<div class="text-center text-sm text-light p-2">No active tasks</div>'
                    }
                </div>
                
                <button class="btn btn-outline w-full" style="border-style:dashed; color:var(--text-light)" onclick="openAddTaskToProject('${p._id}')">+ Add Task</button>
            </div>`
              )
              .join("")}
        </div>
    </div>`;
  lucide.createIcons();
}

// --- UTILS ---
function closeModal() {
  document.getElementById("modal-container").innerHTML = "";
}
function logout() {
  localStorage.clear();
  location.reload();
}
function formatTime(s) {
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
function playAudio(e, url) {
  e.stopPropagation();
  new Audio(API_URL + url).play();
}
function checkAlarms() {
  const now = new Date();
  AppState.tasks.forEach((t) => {
    if (!t.completed && t.date) {
      const tDate = new Date(t.date);
      if (tDate <= now && now - tDate < 60000) {
        if (t.voiceNoteUrl) new Audio(API_URL + t.voiceNoteUrl).play();
        else new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3").play();
        showToast(`🔔 Deadline: ${t.title}`);
      }
    }
  });
}
function showToast(msg) {
  const div = document.createElement("div");
  div.style = "position:fixed;bottom:20px;right:20px;background:#0f172a;color:white;padding:15px 25px;border-radius:12px;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,0.2);animation:fadeIn 0.5s";
  div.innerHTML = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}
window.addMsInput = function () {
  const i = document.createElement("input");
  i.className = "input";
  i.name = "ms[]";
  i.placeholder = "Next Milestone";
  document.getElementById("ms-container").appendChild(i);
};

// --- MODALS (RECORDING FIX) ---
function openAddTaskModal() {
  const d = new Date().toISOString().slice(0, 16);
  document.getElementById(
    "modal-container"
  ).innerHTML = `<div class="lightbox" style="background:rgba(0,0,0,0.5);z-index:2000"><div class="app-card" style="width:500px" onclick="event.stopPropagation()"><h2 class="mb-4">Add Task</h2><form onsubmit="submitTask(event)"><input class="input" name="title" placeholder="What to do?" required><div class="flex gap-2"><select name="priority" class="input"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><input type="datetime-local" name="datetime" class="input" value="${d}"></div><input class="input" name="location" placeholder="📍 Location (Google Maps Link)"><div class="mb-2"><label><input type="checkbox" onchange="document.getElementById('aud').classList.toggle('hidden')"> Voice Note</label><div id="aud" class="hidden btn btn-outline w-full" onclick="rec(this)">Record Audio</div></div><div class="mb-2"><input type="file" name="image" class="input"></div><button class="btn btn-primary w-full">Save Task</button><button type="button" class="btn btn-outline w-full mt-2" onclick="closeModal()">Cancel</button></form></div></div>`;
}
async function submitTask(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (window.ablob) fd.append("voice", window.ablob, "voice.mp3");
  const dt = new Date(fd.get("datetime"));
  fd.append("date", dt.toISOString());
  fd.append("time", dt.toTimeString().slice(0, 5));
  await fetch(API_URL + "/tasks", { method: "POST", headers: { Authorization: `Bearer ${AppState.token}` }, body: fd });
  window.ablob = null;
  closeModal();
  await fetchAllData();
  renderDashboard();
}
async function rec(el) {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(s);
    mediaRecorder.start();
    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      window.ablob = new Blob(audioChunks, { type: "audio/mpeg" });
      el.textContent = "Recorded ✅";
      el.style.borderColor = "green";
    };
    el.textContent = "Stop Recording ⏹";
    el.style.borderColor = "red";
  } else mediaRecorder.stop();
}

// ... (Functions openHabitModal, openGoalModal, openProjectModal, openInvite, openAddTaskToProject - SAMA SEPERTI SEBELUMNYA) ...
function openHabitModal() {
  document.getElementById(
    "modal-container"
  ).innerHTML = `<div class="lightbox" style="background:rgba(0,0,0,0.5);z-index:2000"><div class="app-card" style="width:400px" onclick="event.stopPropagation()"><h2 class="mb-4">New Habit</h2><form onsubmit="postData('/habits', Object.fromEntries(new FormData(event.target))); event.preventDefault()"><input name="name" class="input" placeholder="Name" required><div class="flex gap-2 mb-2">${[
    "💪",
    "📚",
    "🏃",
    "🧘",
  ]
    .map((i) => `<span style="cursor:pointer;font-size:1.5rem" onclick="document.getElementById('ic').value='${i}'">${i}</span>`)
    .join(" ")}</div><input type="hidden" name="icon" id="ic" value="💪"><div class="flex gap-2 mb-2">${["#6366f1", "#10b981", "#ef4444"]
    .map((c) => `<div style="width:20px;height:20px;border-radius:50%;background:${c};cursor:pointer" onclick="document.getElementById('cl').value='${c}'"></div>`)
    .join(
      ""
    )}</div><input type="hidden" name="color" id="cl" value="#6366f1"><select name="frequency" class="select"><option>Daily</option><option>Weekly</option></select><button class="btn btn-primary w-full mt-4">Create</button><button type="button" class="btn btn-outline w-full mt-2" onclick="closeModal()">Cancel</button></form></div></div>`;
}
function openGoalModal() {
  document.getElementById(
    "modal-container"
  ).innerHTML = `<div class="lightbox" style="background:rgba(0,0,0,0.5);z-index:2000"><div class="app-card" style="width:500px;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()"><h2 class="mb-4">New Goal</h2><form onsubmit="handleGoalSubmit(event)"><input name="title" class="input" placeholder="Title" required><textarea name="description" class="textarea" placeholder="Description"></textarea><select name="category" class="select"><option>Personal</option><option>Career</option><option>Health</option></select><input type="date" name="deadline" class="input" required><label>Milestones:</label><div id="ms-container"><input class="input" name="ms[]" placeholder="Milestone 1" required></div><button type="button" class="btn btn-outline w-full mb-4" onclick="addMsInput()">+ Add Milestone</button><button class="btn btn-primary w-full">Create</button><button type="button" class="btn btn-outline w-full mt-2" onclick="closeModal()">Cancel</button></form></div></div>`;
}
async function handleGoalSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const ms = fd
    .getAll("ms[]")
    .filter((x) => x.trim() !== "")
    .map((t) => ({ text: t, completed: false }));
  await postData("/goals", { title: fd.get("title"), description: fd.get("description"), category: fd.get("category"), deadline: fd.get("deadline"), milestones: ms });
}
function openProjectModal() {
  document.getElementById(
    "modal-container"
  ).innerHTML = `<div class="lightbox" style="background:rgba(0,0,0,0.5);z-index:2000"><div class="app-card" style="width:400px" onclick="event.stopPropagation()"><h2 class="mb-4">New Project</h2><form onsubmit="postData('/projects',Object.fromEntries(new FormData(event.target)));event.preventDefault()"><input class="input" name="name" placeholder="Project Name"><div class="flex gap-2 mb-2">${[
    "#6366f1",
    "#10b981",
    "#ef4444",
    "#f59e0b",
  ]
    .map((c) => `<div style="width:20px;height:20px;border-radius:50%;background:${c};cursor:pointer" onclick="document.getElementById('pc').value='${c}'"></div>`)
    .join(
      ""
    )}</div><input type="hidden" name="color" id="pc" value="#6366f1"><button class="btn btn-primary w-full mt-2">Create</button><button type="button" class="btn btn-outline w-full mt-2" onclick="closeModal()">Cancel</button></form></div></div>`;
}
function openInvite(pid) {
  document.getElementById(
    "modal-container"
  ).innerHTML = `<div class="lightbox" style="background:rgba(0,0,0,0.5);z-index:2000"><div class="app-card" style="width:400px" onclick="event.stopPropagation()"><h2 class="mb-4">Invite Member</h2><form onsubmit="handleInvite(event, '${pid}')"><input class="input" name="email" placeholder="Email" type="email" required><button class="btn btn-primary w-full mt-2">Invite</button><button type="button" class="btn btn-outline w-full mt-2" onclick="closeModal()">Cancel</button></form></div></div>`;
}
async function handleInvite(e, pid) {
  e.preventDefault();
  const email = new FormData(e.target).get("email");
  await postData(`/projects/${pid}/invite`, { email: email });
  alert("Sent!");
  closeModal();
}
function openAddTaskToProject(pid) {
  document.getElementById(
    "modal-container"
  ).innerHTML = `<div class="lightbox" style="background:rgba(0,0,0,0.5);z-index:2000"><div class="app-card" style="width:400px" onclick="event.stopPropagation()"><h2 class="mb-4">Add Project Task</h2><form onsubmit="handleProjectTaskAdd(event, '${pid}')"><input class="input" name="title" placeholder="Title" required><input class="input" name="assignee" placeholder="Assignee"><label>Deadline</label><input class="input" name="deadline" type="date"><button class="btn btn-primary w-full mt-2">Add</button><button type="button" class="btn btn-outline w-full mt-2" onclick="closeModal()">Cancel</button></form></div></div>`;
}
async function handleProjectTaskAdd(e, pid) {
  e.preventDefault();
  const fd = new FormData(e.target);
  await postData(`/projects/${pid}/task`, { title: fd.get("title"), assignee: fd.get("assignee"), deadline: fd.get("deadline") });
}

async function updateExp(amt, msg) {
  await fetch(API_URL + "/auth/exp", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${AppState.token}` }, body: JSON.stringify({ amount: amt, msg }) });
  await fetchAllData();
  if (!document.fullscreenElement) renderDashboard();
}
async function postData(u, d) {
  await fetch(API_URL + u, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${AppState.token}` }, body: JSON.stringify(d) });
  closeModal();
  await fetchAllData();
  if (u.includes("habit")) renderHabits();
  else if (u.includes("goal")) renderGoals();
  else if (u.includes("project")) renderTeam();
  else renderDashboard();
}
async function toggleTask(id, s) {
  await fetch(`${API_URL}/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${AppState.token}` }, body: JSON.stringify({ completed: s }) });
  await updateExp(s ? 10 : 0, s ? "Task Done" : "Task Undone");
  await fetchAllData();
  renderDashboard();
}
async function toggleProjectTask(pid, tidx) {
  await fetch(`${API_URL}/projects/${pid}/task/${tidx}`, { method: "PUT", headers: { Authorization: `Bearer ${AppState.token}` } });
  await updateExp(10, "Project Task Done");
  await fetchAllData();
  renderTeam();
}
async function checkHabit(id) {
  await fetch(`${API_URL}/habits/${id}/check`, { method: "POST", headers: { Authorization: `Bearer ${AppState.token}` } });
  await updateExp(5, "Habit Check");
  await fetchAllData();
  renderHabits();
}
async function toggleMilestone(gid, midx) {
  await fetch(`${API_URL}/goals/${gid}/milestone/${midx}`, { method: "PUT", headers: { Authorization: `Bearer ${AppState.token}` } });
  await updateExp(10, "Milestone Reached");
  await fetchAllData();
  renderGoals();
}
