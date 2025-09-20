// --------------------- helpers ---------------------
function localDateString(d = new Date()) {
  // returns YYYY-MM-DD in client's local timezone
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().slice(0, 10);
}

// const apiBase = "http://localhost:5000/api/tasks";
const apiBase = "/api/tasks";

let pieChart = null;
let barChart = null;

// --------------------- DOM ---------------------
const viewDay = document.getElementById("viewDay");
const taskDay = document.getElementById("taskDay");
const prevBtn = document.getElementById("prevDay");
const nextBtn = document.getElementById("nextDay");
const showAllBtn = document.getElementById("showAll");

const tasksContainer = document.getElementById("tasks");
const addBtn = document.getElementById("addBtn");

const titleInput = document.getElementById("title");
const categoryInput = document.getElementById("category");
const durationInput = document.getElementById("duration");
const wastedInput = document.getElementById("wasted");
const learnedInput = document.getElementById("learned");
const notesInput = document.getElementById("notes");
const statusInput = document.getElementById("status");

const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

// set default dates
const today = localDateString();
viewDay.value = today;
taskDay.value = today;

// --------------------- events ---------------------
prevBtn.addEventListener("click", () => {
  const d = new Date(viewDay.value);
  d.setDate(d.getDate() - 1);
  viewDay.value = localDateString(d);
  loadTasksFor(viewDay.value);
});
nextBtn.addEventListener("click", () => {
  const d = new Date(viewDay.value);
  d.setDate(d.getDate() + 1);
  viewDay.value = localDateString(d);
  loadTasksFor(viewDay.value);
});
viewDay.addEventListener("change", () => loadTasksFor(viewDay.value));
showAllBtn.addEventListener("click", () => loadTasksFor()); // no query => all

addBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const category = categoryInput.value.trim() || "General";
  const duration = parseInt(durationInput.value || 0);
  const wasted = parseInt(wastedInput.value || 0);
  const learned = parseInt(learnedInput.value || 0);
  const day = taskDay.value || localDateString();
  const notes = notesInput.value.trim();
  const status = statusInput.value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const isOffice = document.getElementById("isOffice").checked;

  if (!title) return alert("Please enter a title");

  if (wasted + learned > duration) {
    if (!confirm("wasted + learned > duration. Save anyway?")) return;
  }

  const body = {
    title,
    category,
    duration,
    wasted,
    learned,
    day,
    status,
    notes,
    startTime,
    endTime,
    isOffice,
  };

  const res = await fetch(apiBase, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return alert("Error adding task");

  // clear inputs
  titleInput.value = "";
  categoryInput.value = "";
  durationInput.value = "";
  wastedInput.value = "";
  learnedInput.value = "";
  notesInput.value = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
  document.getElementById("isOffice").checked = false;

  loadTasksFor(viewDay.value || localDateString());
});

// --------------------- fetch & render ---------------------
async function loadTasksFor(day) {
  // if day provided: fetch /api/tasks?day=YYYY-MM-DD
  // else fetch all
  let url = apiBase;
  if (day) url += `?day=${day}`;
  const res = await fetch(url);
  const tasks = await res.json();
  renderTasks(tasks);
  renderCharts(tasks, day);
}

function renderTasks(tasks) {
  tasksContainer.innerHTML = "";
  if (!tasks || tasks.length === 0) {
    tasksContainer.innerHTML = `<p style="color:#94a3b8">No tasks for this day.</p>`;
    return;
  }
  tasks.forEach((t) => {
    const div = document.createElement("div");
    div.className =
      "task-card " + (t.status === "completed" ? "completed" : "");
    div.innerHTML = `
      <h3>${escapeHtml(t.title)}</h3>
      <div class="task-meta">${t.category} · ${t.duration} min · ${
      t.learned
    } learned · ${t.wasted} wasted</div>
      <div style="font-size:.9rem;color:#9fb0d7;margin-bottom:6px">${
        t.notes || ""
      }</div>
      <div class="task-actions">
        <button class="btn-toggle">${
          t.status === "pending" ? "✔ Complete" : "↩ Undo"
        }</button>
        <button class="btn-del">🗑 Delete</button>
      </div>
      <div style="margin-top:8px;font-size:.8rem;color:var(--muted)">Day: ${
        t.day
      } · added ${new Date(t.createdAt).toLocaleString()}</div>
    `;
    // toggle
    div.querySelector(".btn-toggle").addEventListener("click", async () => {
      await fetch(`${apiBase}/${t._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: t.status === "pending" ? "completed" : "pending",
        }),
      });
      loadTasksFor(viewDay.value || localDateString());
    });
    // delete
    div.querySelector(".btn-del").addEventListener("click", async () => {
      if (!confirm("Delete this task?")) return;
      await fetch(`${apiBase}/${t._id}`, { method: "DELETE" });
      loadTasksFor(viewDay.value || localDateString());
    });
    tasksContainer.appendChild(div);
  });
}

function renderCharts(tasks, day) {
  // compute totals
  const total = tasks.reduce((s, t) => s + (t.duration || 0), 0);
  const totalLearned = tasks.reduce((s, t) => s + (t.learned || 0), 0);
  const totalWasted = tasks.reduce((s, t) => s + (t.wasted || 0), 0);
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const percent = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  // progress
  progressFill.style.width = percent + "%";
  progressText.textContent = `${completedCount} / ${tasks.length} done • ${percent}%`;

  // pie: wasted vs learned
  if (pieChart) pieChart.destroy();
  const pieCtx = document.getElementById("pieChart").getContext("2d");
  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: ["Learned", "Wasted", "Other"],
      datasets: [
        {
          data: [
            totalLearned,
            totalWasted,
            Math.max(0, total - totalLearned - totalWasted),
          ],
          backgroundColor: ["#34d399", "#fb7185", "#60a5fa"],
        },
      ],
    },
  });

  // bar: category -> duration
  const catMap = {};
  tasks.forEach((t) => {
    catMap[t.category] = (catMap[t.category] || 0) + (t.duration || 0);
  });
  if (barChart) barChart.destroy();
  const barCtx = document.getElementById("barChart").getContext("2d");
  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: Object.keys(catMap),
      datasets: [
        {
          label: "Minutes",
          data: Object.values(catMap),
          backgroundColor: "#60a5fa",
        },
      ],
    },
    options: {
      scales: { y: { beginAtZero: true } },
    },
  });
}

// simple html escape for safety
function escapeHtml(s) {
  if (!s) return "";
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// initial load
loadTasksFor(viewDay.value);

const music = document.getElementById("music");
const playPauseBtn = document.getElementById("playPause"); // <-- added this
const prevSongBtn = document.getElementById("prevSong");
const nextSongBtn = document.getElementById("nextSong");
const currentSongLabel = document.getElementById("currentSong");

const songs = [
  "songs/song1.mp3",
  "songs/song2.mp3",
  "songs/song3.mp3",
  "songs/song4.mp3",
];

let currentSong = 0;
music.src = songs[currentSong];
currentSongLabel.textContent = `Song ${currentSong + 1}`;
music.play();

// Play/pause toggle
playPauseBtn.addEventListener("click", () => {
  if (music.paused) {
    music.play();
    playPauseBtn.textContent = "⏸";
  } else {
    music.pause();
    playPauseBtn.textContent = "▶";
  }
});

// Next song
nextSongBtn.addEventListener("click", () => {
  currentSong = (currentSong + 1) % songs.length;
  music.src = songs[currentSong];
  currentSongLabel.textContent = `Song ${currentSong + 1}`;
  music.play();
  playPauseBtn.textContent = "⏸";
});

// Previous song
prevSongBtn.addEventListener("click", () => {
  currentSong = (currentSong - 1 + songs.length) % songs.length;
  music.src = songs[currentSong];
  currentSongLabel.textContent = `Song ${currentSong + 1}`;
  music.play();
  playPauseBtn.textContent = "⏸";
});

// Auto next song
music.addEventListener("ended", () => {
  currentSong = (currentSong + 1) % songs.length;
  music.src = songs[currentSong];
  currentSongLabel.textContent = `Song ${currentSong + 1}`;
  music.play();
});
