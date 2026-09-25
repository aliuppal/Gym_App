import { toKey, fromKey, addDays, startOfWeek, computeStats } from "./stats.js";
import { WORKOUT_TYPES, defaultData, normalize, load, save } from "./storage.js";

const $ = (id) => document.getElementById(id);
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HEATMAP_WEEKS = 26;

let data = load();
let today = startOfToday();
let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let editingKey = null;
let selectedType = WORKOUT_TYPES[0];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function persist() {
  if (!save(data)) toast("Couldn't save — storage is full or disabled");
  render();
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

// ---------- Rendering ----------

function render() {
  const { weeklyGoal, weekStart } = data.settings;
  const stats = computeStats(data.days, today, data.settings);
  const loggedToday = Boolean(data.days[toKey(today)]);

  $("todayLabel").textContent = today.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  const logBtn = $("logTodayBtn");
  logBtn.textContent = loggedToday ? `✓ Logged today · ${data.days[toKey(today)].type}` : "Log today's workout";
  logBtn.classList.toggle("done", loggedToday);

  $("statStreak").textContent = stats.currentStreak;
  $("statWeek").textContent = `${stats.thisWeek}/${weeklyGoal}`;
  $("goalFill").style.width = `${Math.min(100, (stats.thisWeek / weeklyGoal) * 100)}%`;
  $("statGoalStreak").textContent = stats.weeklyGoalStreak;
  $("statLongest").textContent = stats.longestStreak;
  $("statMonth").textContent = stats.thisMonth;
  $("statYear").textContent = stats.thisYear;

  renderCalendar(weekStart);
  renderHeatmap(weekStart);
}

function renderCalendar(weekStart) {
  $("monthLabel").textContent = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const weekdays = $("weekdays");
  weekdays.replaceChildren(
    ...Array.from({ length: 7 }, (_, i) => {
      const el = document.createElement("div");
      el.textContent = WEEKDAY_NAMES[(i + weekStart) % 7];
      return el;
    }),
  );

  const cal = $("calendar");
  const cells = [];
  const leading = (viewMonth.getDay() - weekStart + 7) % 7;
  for (let i = 0; i < leading; i++) {
    const pad = document.createElement("div");
    pad.className = "day empty";
    cells.push(pad);
  }

  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const todayKey = toKey(today);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
    const key = toKey(date);
    const entry = data.days[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day";
    btn.textContent = d;
    btn.dataset.key = key;
    if (entry) btn.classList.add("active");
    if (key === todayKey) btn.classList.add("today");
    if (key > todayKey) {
      btn.classList.add("future");
      btn.disabled = true;
    }
    const label = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    btn.setAttribute("aria-label", entry ? `${label}: ${entry.type}` : `${label}: rest day`);
    cells.push(btn);
  }
  cal.replaceChildren(...cells);

  // Don't allow browsing past the current month.
  $("nextMonth").disabled =
    viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();
}

function renderHeatmap(weekStart) {
  const start = addDays(startOfWeek(today, weekStart), -7 * (HEATMAP_WEEKS - 1));
  const todayKey = toKey(today);
  const counts = {};
  const cells = [];
  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const date = addDays(start, i);
    const key = toKey(date);
    const cell = document.createElement("div");
    cell.className = "cell";
    if (key > todayKey) {
      cell.classList.add("pad");
    } else {
      const entry = data.days[key];
      if (entry) {
        cell.classList.add("on");
        counts[entry.type] = (counts[entry.type] || 0) + 1;
      }
      cell.title = `${date.toLocaleDateString()}${entry ? ` · ${entry.type}` : ""}`;
    }
    cells.push(cell);
  }
  $("heatmap").style.gridTemplateColumns = `repeat(${HEATMAP_WEEKS}, 1fr)`;
  $("heatmap").replaceChildren(...cells);

  const breakdown = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => {
      const el = document.createElement("span");
      el.textContent = `${type} · ${n}`;
      return el;
    });
  $("breakdown").replaceChildren(...breakdown);
}

// ---------- Day dialog ----------

function buildTypeChips() {
  const fieldset = $("typeChips");
  for (const type of WORKOUT_TYPES) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = type;
    chip.dataset.type = type;
    chip.addEventListener("click", () => selectType(type));
    fieldset.append(chip);
  }
}

function selectType(type) {
  selectedType = type;
  for (const chip of $("typeChips").querySelectorAll(".chip")) {
    chip.setAttribute("aria-pressed", String(chip.dataset.type === type));
  }
}

function lastUsedType() {
  const keys = Object.keys(data.days).sort();
  return keys.length ? data.days[keys[keys.length - 1]].type : WORKOUT_TYPES[0];
}

function openDay(key) {
  editingKey = key;
  const entry = data.days[key];
  $("dayTitle").textContent = fromKey(key).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  selectType(entry ? entry.type : lastUsedType());
  $("dayNote").value = entry ? entry.note : "";
  $("removeDay").hidden = !entry;
  $("saveDay").textContent = entry ? "Save" : "Log workout";
  $("dayDialog").showModal();
}

function saveDay() {
  data.days[editingKey] = { type: selectedType, note: $("dayNote").value.trim() };
  persist();
}

function removeDay() {
  delete data.days[editingKey];
  $("dayDialog").close();
  persist();
  toast("Workout removed");
}

// ---------- Settings ----------

function openSettings() {
  $("goalSelect").value = String(data.settings.weeklyGoal);
  $("weekStartSelect").value = String(data.settings.weekStart);
  $("settingsDialog").showModal();
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gym-days-${toKey(today)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importData(file) {
  try {
    const imported = normalize(JSON.parse(await file.text()));
    const count = Object.keys(imported.days).length;
    if (!confirm(`Import ${count} workout day(s)? They will be merged with your current data.`)) return;
    data = { ...data, days: { ...data.days, ...imported.days }, settings: imported.settings };
    persist();
    openSettings();
    toast(`Imported ${count} day(s)`);
  } catch {
    toast("That file isn't a valid Gym Days backup");
  }
}

// ---------- Wiring ----------

function init() {
  buildTypeChips();
  for (let i = 1; i <= 7; i++) $("goalSelect").append(new Option(`${i} day${i > 1 ? "s" : ""} per week`, i));

  $("logTodayBtn").addEventListener("click", () => {
    const key = toKey(today);
    if (data.days[key]) {
      openDay(key);
    } else {
      data.days[key] = { type: lastUsedType(), note: "" };
      persist();
      toast("Nice work! Workout logged 💪");
    }
  });

  $("calendar").addEventListener("click", (e) => {
    const btn = e.target.closest("button.day");
    if (btn && !btn.disabled) openDay(btn.dataset.key);
  });

  $("prevMonth").addEventListener("click", () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    render();
  });
  $("nextMonth").addEventListener("click", () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    render();
  });

  $("dayForm").addEventListener("submit", saveDay);
  $("cancelDay").addEventListener("click", () => $("dayDialog").close());
  $("removeDay").addEventListener("click", removeDay);

  $("settingsBtn").addEventListener("click", openSettings);
  $("goalSelect").addEventListener("change", (e) => {
    data.settings.weeklyGoal = Number(e.target.value);
    persist();
  });
  $("weekStartSelect").addEventListener("change", (e) => {
    data.settings.weekStart = Number(e.target.value);
    persist();
  });
  $("exportBtn").addEventListener("click", exportData);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) importData(file);
  });
  $("resetBtn").addEventListener("click", () => {
    if (!confirm("Delete all workout history on this device? This can't be undone.")) return;
    data = defaultData();
    $("settingsDialog").close();
    persist();
    toast("All data deleted");
  });

  // Close sheets when tapping the backdrop.
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  // Keep "today" correct if the app stays open (or backgrounded) past midnight,
  // and pick up changes made in another tab.
  const refreshToday = () => {
    const now = startOfToday();
    if (now.getTime() === today.getTime()) return;
    today = now;
    viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    render();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshToday();
  });
  window.addEventListener("storage", () => {
    data = load();
    render();
  });
  setInterval(refreshToday, 60 * 1000);

  render();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
