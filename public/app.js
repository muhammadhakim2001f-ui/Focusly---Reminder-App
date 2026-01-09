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
      renderDashboard(); // Default view
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

// --- AUTH (Login/Signup sama seperti sebelumnya) ---
function renderLogin() {
  document.getElementById("app").innerHTML = `
    <div class="auth-wrapper">
        <div class="auth-card">
            <h1>Focusly</h1>
            <p style="opacity:0.9;margin-bottom:2rem">Productivity Evolved.</p>
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
        location.reload();
      }
    } else {
      alert(result.error || "Authentication failed");
    }
  } catch (error) {
    console.error("Auth Error:", error);
    alert("Cannot connect to server.");
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

// --- DASHBOARD ---
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
    if (tasks.some((t) => t.priority === "high")) dots += `<div class="dot" style="background:var(--danger)"></div>`;
    if (tasks.some((t) => t.priority === "medium")) dots += `<div class="dot" style="background:var(--warning)"></div>`;
    if (tasks.some((t) => t.priority === "low")) dots += `<div class="dot" style="background:var(--success)"></div>`;

    const isSel = i === d.getDate();
    const isToday = new Date().toDateString() === dateStr;
    let style = isToday ? "border:2px solid var(--primary)" : "";
    h += `<div class="cal-day ${isSel ? "selected" : ""}" style="${style}" onclick="AppState.selectedDate.setDate(${i});renderDashboard()">${i}<div class="dots">${dots}</div></div>`;
  }
  return h;
}

function renderTaskItem(t) {
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

// --- LIGHTBOX ---
window.openLightbox = function (url) {
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `<img src="${url}" onclick="event.stopPropagation()">`;
  lb.onclick = () => lb.remove();
  document.body.appendChild(lb);
};

// --- FOCUS MODE (FIXED SYMMETRY & BUTTONS) ---
function startFocusSession(taskId) {
  AppState.timer.activeTaskId = taskId;
  renderFocusMode();
}
function renderFocusMode() {
  const activeTask = AppState.tasks.find((t) => t._id === AppState.timer.activeTaskId);

  // Perbaikan Layout Timer
  document.getElementById("app").innerHTML = `
    ${renderNavbar("focus")}
    <div class="focus-container">
        <div class="timer-card" style="${document.fullscreenElement ? "background:transparent;box-shadow:none;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh" : ""}">
            <h2 class="mb-4" style="text-align:center; color:${document.fullscreenElement ? "white" : "var(--text)"}">${activeTask ? activeTask.title : "Focus Session"}</h2>
            
            <div class="timer-wrapper" style="position:relative; width:300px; height:300px; display:flex; justify-content:center; align-items:center;">
                <svg class="timer-svg" style="width:300px; height:300px; transform: rotate(-90deg);">
                    <circle cx="150" cy="150" r="140" class="timer-bg" style="fill:none; stroke:#e2e8f0; stroke-width:15;"></circle>
                    <circle cx="150" cy="150" r="140" class="timer-path" id="tp" style="fill:none; stroke:var(--primary); stroke-width:15; stroke-dasharray:880; stroke-dashoffset:0; transition:stroke-dashoffset 1s linear;"></circle>
                </svg>
                <div class="timer-text" id="tt" style="position:absolute; font-size:3.5rem; font-weight:bold; color:${document.fullscreenElement ? "white" : "var(--text)"}; text-align:center;">${formatTime(AppState.timer.timeLeft)}</div>
            </div>

            ${
              !document.fullscreenElement
                ? `
            <div class="flex justify-center gap-2 mt-8 items-center">
                <button class="btn btn-outline btn-sm" onclick="setT(25)">25m</button>
                <button class="btn btn-outline btn-sm" onclick="setT(5)">5m</button>
                <div class="flex">
                    <input type="number" id="customMin" class="input" style="width:70px;margin:0;text-align:center;border-top-right-radius:0;border-bottom-right-radius:0" placeholder="Min">
                    <button class="btn btn-primary btn-sm" style="border-top-left-radius:0;border-bottom-left-radius:0" onclick="setT(document.getElementById('customMin').value)">Set</button>
                </div>
            </div>`
                : ""
            }

            <div class="controls-area flex justify-center gap-4 mt-8">
                <button id="fb" class="btn btn-primary" style="padding:1rem 3rem;font-size:1.2rem; min-width:150px" onclick="togF()">Start Focus</button>
                <button class="btn btn-outline" style="padding:1rem 2rem;font-size:1.2rem; background:white; color:var(--text)" onclick="resF()">Reset</button>
            </div>
        </div>
    </div>`;
  lucide.createIcons();
  updF();
}
function setT(m) {
  if (!m) return;
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
  if (AppState.timer.activeTaskId) {
    const task = AppState.tasks.find((t) => t._id === AppState.timer.activeTaskId);
    if (task && task.voiceNoteUrl) new Audio(API_URL + task.voiceNoteUrl).play();
    else new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3").play();
  } else new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3").play();

  if (document.fullscreenElement) document.exitFullscreen();

  // Gunakan skipRender = true agar tidak redirect ke dashboard
  updateExp(50, "Focus Session", true);
  showToast("TIME IS UP! Great Job! 🎉");
  resF();
}
function resF() {
  clearInterval(AppState.timer.interval);
  AppState.timer.isRunning = false;
  AppState.timer.timeLeft = AppState.timer.totalTime;
  if (document.fullscreenElement) document.exitFullscreen();
  renderFocusMode();
}
function updF() {
  if (document.getElementById("tt")) {
    document.getElementById("tt").textContent = formatTime(AppState.timer.timeLeft);
    const offset = 880 * (1 - AppState.timer.timeLeft / AppState.timer.totalTime);
    if (document.getElementById("tp")) document.getElementById("tp").style.strokeDashoffset = offset;
  }
}

// --- HABITS (FIXED GLITCH) ---
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

// --- GOALS (FIXED GLITCH & ADD MILESTONE) ---
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
            <div class="mb-4">${g.milestones
              .map(
                (m, i) =>
                  `<div class="flex gap-2 mb-2 text-sm items-center"><input type="checkbox" ${m.completed ? "checked" : ""} onchange="toggleMilestone('${g._id}',${i})"> <span style="${
                    m.completed ? "text-decoration:line-through;color:#94a3b8" : ""
                  }">${m.text}</span></div>`
              )
              .join("")}</div>
            
            <div class="flex gap-2">
                <input id="new-ms-${g._id}" class="input" style="margin:0; padding:5px 10px; font-size:0.8rem" placeholder="New milestone...">
                <button class="btn btn-sm btn-outline" onclick="addMilestone('${g._id}')">+</button>
            </div>
        </div>`
      )
      .join("")}</div></div>`;
  lucide.createIcons();
}

// --- TEAM (FIXED GLITCH, ASSIGNEE, REALTIME UPDATE) ---
function renderTeam() {
  const getColor = (str) => {
    const colors = ["#e0e7ff", "#ffedd5", "#ccfbf1", "#fce7f3", "#fae8ff", "#fee2e2"];
    let hash = 0;
    if (!str) return colors[0];
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
                        <div class="member-avatar" title="You" style="background:${p.color}; color:white; border-color:white">ME</div>
                        ${p.members.map((m) => `<div class="member-avatar" title="${m}" style="background:${getColor(m)}">${m.substring(0, 2).toUpperCase()}</div>`).join("")}
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
                        <div class="flex flex-col text-sm mb-2 p-2 bg-white rounded border">
                            <div class="flex justify-between items-center mb-1">
                                <div class="flex gap-2 items-center" style="overflow:hidden;">
                                    <input type="checkbox" ${t.completed ? "checked" : ""} onchange="toggleProjectTask('${p._id}',${i})"> 
                                    <span style="${t.completed ? "text-decoration:line-through;color:#ccc" : ""}; font-weight:600">${t.title}</span>
                                </div>
                                <small class="text-primary font-bold" style="font-size:0.7rem">${t.deadline ? new Date(t.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</small>
                            </div>
                            <div class="flex justify-between items-center pl-6">
                                <small style="color:gray; font-size:0.75rem">👤 ${t.assignee || "Unassigned"}</small>
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

// --- UTILS (MODIFIED XP UPDATE) ---
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
  // Alarms logic
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

// --- API ACTIONS (CORE LOGIC FIXES) ---

// 1. Update Exp dengan Skip Render
async function updateExp(amt, msg, skipRender = false) {
  await fetch(API_URL + "/auth/exp", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${AppState.token}` }, body: JSON.stringify({ amount: amt, msg }) });
  // Kita fetch data baru tapi JANGAN render dashboard kalau skipRender=true
  if (!skipRender) {
    await fetchAllData();
    if (!document.fullscreenElement) renderDashboard();
  }
}

async function postData(u, d) {
  await fetch(API_URL + u, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${AppState.token}` }, body: JSON.stringify(d) });
  closeModal();
  await fetchAllData(); // Refresh Data

  // Render ulang halaman yang BENAR
  if (u.includes("habit")) renderHabits();
  else if (u.includes("goal")) renderGoals();
  else if (u.includes("project")) renderTeam();
  else renderDashboard();
}

// 2. Logic Check Habit (Tanpa Pindah Halaman)
async function checkHabit(id) {
  // Optimistic UI Update (Biar cepet berubah warnanya)
  const h = AppState.habits.find((x) => x._id === id);
  if (h) h.streak++;
  renderHabits(); // Render lokal dulu

  await fetch(`${API_URL}/habits/${id}/check`, { method: "POST", headers: { Authorization: `Bearer ${AppState.token}` } });
  await updateExp(5, "Habit Check", true); // TRUE = Jangan render dashboard
  await fetchAllData(); // Ambil data asli
  renderHabits(); // Render ulang habits
}

// 3. Logic Toggle Task (Dashboard)
async function toggleTask(id, s) {
  await fetch(`${API_URL}/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${AppState.token}` }, body: JSON.stringify({ completed: s }) });
  await updateExp(s ? 10 : 0, s ? "Task Done" : "Task Undone", false); // Dashboard boleh dirender ulang
}

// 4. Logic Toggle Project Task (Tanpa Pindah Halaman & Realtime-ish)
async function toggleProjectTask(pid, tidx) {
  // Optimistic UI
  const p = AppState.projects.find((x) => x._id === pid);
  if (p && p.tasks[tidx]) p.tasks[tidx].completed = !p.tasks[tidx].completed;
  renderTeam();

  await fetch(`${API_URL}/projects/${pid}/task/${tidx}`, { method: "PUT", headers: { Authorization: `Bearer ${AppState.token}` } });
  await updateExp(10, "Project Task Done", true); // TRUE = Jangan ke dashboard
  await fetchAllData();
  renderTeam(); // Render ulang halaman team
}

// 5. Logic Toggle Milestone (Tanpa Pindah Halaman)
async function toggleMilestone(gid, midx) {
  // Optimistic UI
  const g = AppState.goals.find((x) => x._id === gid);
  if (g && g.milestones[midx]) g.milestones[midx].completed = !g.milestones[midx].completed;
  renderGoals();

  await fetch(`${API_URL}/goals/${gid}/milestone/${midx}`, { method: "PUT", headers: { Authorization: `Bearer ${AppState.token}` } });
  await updateExp(10, "Milestone Reached", true); // TRUE = Jangan ke dashboard
  await fetchAllData();
  renderGoals();
}

// 6. Logic Add Milestone (Baru)
async function addMilestone(gid) {
  const input = document.getElementById(`new-ms-${gid}`);
  const text = input.value;
  if (!text) return;

  await fetch(`${API_URL}/goals/${gid}/milestone`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AppState.token}` },
    body: JSON.stringify({ text }),
  });
  input.value = "";
  await fetchAllData();
  renderGoals();
}

// --- MODALS (Fix Dropdown Assignee) ---
function openAddTaskToProject(pid) {
  const project = AppState.projects.find((p) => p._id === pid);
  const members = project ? [AppState.user.email, ...project.members] : []; // Include diri sendiri

  document.getElementById(
    "modal-container"
  ).innerHTML = `<div class="lightbox" style="background:rgba(0,0,0,0.5);z-index:2000"><div class="app-card" style="width:400px" onclick="event.stopPropagation()"><h2 class="mb-4">Add Project Task</h2><form onsubmit="handleProjectTaskAdd(event, '${pid}')"><input class="input" name="title" placeholder="Title" required><label>Assign To:</label><select class="select" name="assignee">${members
    .map((m) => `<option value="${m}">${m}</option>`)
    .join(
      ""
    )}</select><label>Deadline</label><input class="input" name="deadline" type="date"><button class="btn btn-primary w-full mt-2">Add</button><button type="button" class="btn btn-outline w-full mt-2" onclick="closeModal()">Cancel</button></form></div></div>`;
}

// ... (Fungsi modal lain openAddTaskModal, openHabitModal, dll biarkan sama, tapi pastikan fungsi 'submitTask', 'rec' dll ada di file asli Anda. Saya singkat disini untuk hemat ruang karakter, tapi JANGAN DIHAPUS dari file Anda) ...
// Copy paste fungsi modal lain dari app.js lama Anda ke sini.
// ...
