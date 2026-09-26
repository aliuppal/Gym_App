import { toKey, fromKey, addDays, startOfWeek, computeStats } from "./stats.js";
import { WORKOUT_TYPES, defaultData, normalize } from "./storage.js";
import { openStore, requestPersistence, isPersisted } from "./db.js";
import { initPhotos } from "./photos.js";
import { cloudEnabled, getUser, signInWithGoogle, signOut, onAuthChange, openCloudStore } from "./cloud.js";

const $ = (id) => document.getElementById(id);
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HEATMAP_WEEKS = 26;

let data = defaultData();
let store = null;
let user = null;
let today = startOfToday();
let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let editingKey = null;
let selectedTypes = new Set();

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Other open tabs/windows of the app reload from the database when we write.
const channel = "BroadcastChannel" in window ? new BroadcastChannel("gym-days") : null;

// Renders the optimistic in-memory change right away, then writes it to the
// on-device database. On failure the UI is reloaded from what was actually saved.
async function commit(write) {
  render();
  try {
    await write;
    channel?.postMessage("changed");
    requestPersistence().then(renderStorageInfo);
  } catch (err) {
    console.error(err);
    toast(store.kind === "supabase"
      ? "Couldn't save — check your internet connection"
      : "Couldn't save — device storage is full or unavailable");
    await reloadFromStore();
  }
}

async function reloadFromStore() {
  try {
    data = await store.load();
  } catch (err) {
    console.error(err);
    return;
  }
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
  logBtn.textContent = loggedToday ? `✓ Logged today · ${formatTypes(data.days[toKey(today)])}` : "Log today's workout";
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
    btn.setAttribute("aria-label", entry ? `${label}: ${formatTypes(entry)}` : `${label}: rest day`);
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
        for (const type of entry.types) counts[type] = (counts[type] || 0) + 1;
      }
      cell.title = `${date.toLocaleDateString()}${entry ? ` · ${formatTypes(entry)}` : ""}`;
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
    chip.addEventListener("click", () => toggleType(type));
    fieldset.append(chip);
  }
}

function setTypes(types) {
  selectedTypes = new Set(types);
  for (const chip of $("typeChips").querySelectorAll(".chip")) {
    chip.setAttribute("aria-pressed", String(selectedTypes.has(chip.dataset.type)));
  }
  $("saveDay").disabled = selectedTypes.size === 0;
}

function toggleType(type) {
  const next = new Set(selectedTypes);
  if (next.has(type)) next.delete(type);
  else next.add(type);
  setTypes(next);
}

function formatTypes(entry) {
  return entry.types.join(" + ");
}

function lastUsedTypes() {
  const keys = Object.keys(data.days).sort();
  return keys.length ? [...data.days[keys[keys.length - 1]].types] : [WORKOUT_TYPES[0]];
}

function openDay(key) {
  editingKey = key;
  const entry = data.days[key];
  $("dayTitle").textContent = fromKey(key).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  setTypes(entry ? entry.types : lastUsedTypes());
  $("dayNote").value = entry ? entry.note : "";
  $("removeDay").hidden = !entry;
  $("saveDay").textContent = entry ? "Save" : "Log workout";
  $("dayDialog").showModal();
}

function saveDay() {
  if (selectedTypes.size === 0) return;
  // Keep the canonical WORKOUT_TYPES order regardless of tap order.
  const types = WORKOUT_TYPES.filter((t) => selectedTypes.has(t));
  const entry = { types, note: $("dayNote").value.trim() };
  data.days[editingKey] = entry;
  commit(store.putDay(editingKey, entry));
}

function removeDay() {
  delete data.days[editingKey];
  $("dayDialog").close();
  commit(store.deleteDay(editingKey));
  toast("Workout removed");
}

// ---------- Settings ----------

function openSettings() {
  $("goalSelect").value = String(data.settings.weeklyGoal);
  $("weekStartSelect").value = String(data.settings.weekStart);
  renderStorageInfo();
  $("settingsDialog").showModal();
}

async function renderStorageInfo() {
  if (!store) return;
  const count = Object.keys(data.days).length;
  if (store.kind === "supabase") {
    $("storageInfo").textContent =
      `Cloud database · ${count} day${count === 1 ? "" : "s"} saved. Synced across every device you sign in on.`;
    return;
  }
  const where = store.kind === "indexeddb" ? "On-device database" : "Browser storage (limited)";
  const persisted = await isPersisted();
  const safety =
    persisted === true
      ? "Protected from automatic cleanup."
      : "The system may clear it if the device runs very low on space — export a backup now and then.";
  $("storageInfo").textContent = `${where} · ${count} day${count === 1 ? "" : "s"} saved. ${safety}`;
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
    await commit(store.replaceAll(data));
    openSettings();
    toast(`Imported ${count} day(s)`);
  } catch {
    toast("That file isn't a valid Gym Days backup");
  }
}

// ---------- Account ----------

// Set when someone chooses "Use without an account", so they aren't asked to
// sign in on every launch.
const GUEST_KEY = "gym-days:guest";

function isGuest() {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

function setGuest(on) {
  try {
    if (on) localStorage.setItem(GUEST_KEY, "1");
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    // Not remembered; they'll just see the sign-in screen next time.
  }
}

function showSignIn(message = "") {
  document.querySelector("main.app").hidden = true;
  $("signInScreen").hidden = false;
  $("signInError").textContent = message;
  $("signInError").hidden = !message;
}

async function startGoogleSignIn(button) {
  button.disabled = true;
  try {
    await signInWithGoogle(); // navigates away to Google
  } catch (err) {
    console.error(err);
    button.disabled = false;
    toast("Couldn't start Google sign-in — check your connection");
  }
}

async function logOut() {
  $("logOutBtn").disabled = true;
  try {
    await signOut();
  } catch (err) {
    console.error(err);
  }
  location.reload();
}

async function openDeviceStore() {
  store = await openStore();
  data = await store.load();
}

// Opens the account's cloud store, or the on-device store for guests. Returns
// false while the sign-in screen is showing.
async function openAccountStore() {
  $("googleSignInBtn").onclick = () => startGoogleSignIn($("googleSignInBtn"));
  $("guestBtn").onclick = () => {
    setGuest(true);
    location.reload();
  };
  try {
    user = await getUser();
  } catch (err) {
    console.error(err);
    if (isGuest()) {
      await openDeviceStore();
      return true;
    }
    showSignIn("Couldn't reach the server. Check your internet connection and reload.");
    return false;
  }
  if (!user) {
    if (isGuest()) {
      await openDeviceStore();
      return true;
    }
    showSignIn();
    return false;
  }
  setGuest(false);
  store = await openCloudStore(user);
  data = await store.load();
  await mergeDeviceData();
  onAuthChange((event) => {
    if (event === "SIGNED_OUT") location.reload();
  });
  return true;
}

// Moves workouts saved on this device (as a guest, or before accounts existed)
// into the account. Days already in the account win; the device copy is
// cleared once the upload has succeeded.
async function mergeDeviceData() {
  try {
    const local = await openStore();
    const localData = await local.load();
    const count = Object.keys(localData.days).length;
    if (count === 0) return;
    const accountIsNew = Object.keys(data.days).length === 0;
    const merged = {
      ...data,
      days: { ...localData.days, ...data.days },
      settings: accountIsNew ? localData.settings : data.settings,
    };
    await store.replaceAll(merged);
    data = merged;
    await local.replaceAll(defaultData());
    toast(`Added ${count} workout day(s) from this device to your account`);
  } catch (err) {
    console.warn("Couldn't move on-device data to the cloud", err);
  }
}

function userName() {
  const meta = user.user_metadata ?? {};
  return meta.full_name || meta.name || user.email || "Gym Days user";
}

// Google profile photo, falling back to the first letter of the name.
function renderAvatar(el) {
  const initial = document.createElement("span");
  initial.textContent = userName().trim().charAt(0).toUpperCase();
  el.replaceChildren(initial);
  const meta = user.user_metadata ?? {};
  const url = meta.avatar_url || meta.picture;
  if (!url) return;
  const img = new Image();
  img.alt = "";
  img.referrerPolicy = "no-referrer"; // Google photos can refuse requests that carry a referrer
  img.onload = () => el.replaceChildren(img);
  img.src = url;
}

function renderAccountButton() {
  const btn = $("accountBtn");
  btn.hidden = !cloudEnabled;
  if (!cloudEnabled) return;
  if (user) {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    renderAvatar(avatar);
    btn.replaceChildren(avatar);
    btn.setAttribute("aria-label", `Profile: ${userName()}`);
    btn.onclick = openProfile;
    $("footerNote").textContent = "Your workouts are saved to your account and sync across your devices.";
  } else {
    btn.textContent = "Sign in";
    btn.classList.add("signin-btn");
    btn.removeAttribute("aria-label");
    btn.onclick = () => startGoogleSignIn(btn);
    $("footerNote").textContent = "You're not signed in, so workouts stay on this device. Sign in to sync them across devices.";
  }
}

function openProfile() {
  const stats = computeStats(data.days, today, data.settings);
  renderAvatar($("profileAvatar"));
  $("profileName").textContent = userName();
  $("profileEmail").textContent = user.email ?? "";
  $("profileEmail").hidden = !user.email || user.email === userName();
  const since = new Date(user.created_at);
  $("profileSince").textContent = `Signed in with Google · member since ${since.toLocaleDateString(undefined, {
    month: "long", year: "numeric",
  })}`;
  $("profileTotal").textContent = Object.keys(data.days).length;
  $("profileStreak").textContent = stats.currentStreak;
  $("profileLongest").textContent = stats.longestStreak;
  $("logOutBtn").disabled = false;
  $("profileDialog").showModal();
}

// ---------- Wiring ----------

async function init() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  try {
    if (cloudEnabled) {
      if (!(await openAccountStore())) return;
    } else {
      await openDeviceStore();
    }
  } catch (err) {
    console.error(err);
    if (cloudEnabled) showSignIn("Couldn't load your workouts. Check your internet connection and reload.");
    else toast("Couldn't open on-device storage");
    return;
  }

  renderAccountButton();
  $("logOutBtn").addEventListener("click", logOut);
  initPhotos({
    getStore: () => store,
    isSignedIn: () => store.kind === "supabase",
    getStats: () => ({ stats: computeStats(data.days, today, data.settings), weeklyGoal: data.settings.weeklyGoal }),
    todayKey: () => toKey(today),
    toast,
  });

  buildTypeChips();
  for (let i = 1; i <= 7; i++) $("goalSelect").append(new Option(`${i} day${i > 1 ? "s" : ""} per week`, i));

  $("logTodayBtn").addEventListener("click", () => {
    const key = toKey(today);
    if (data.days[key]) {
      openDay(key);
    } else {
      const entry = { types: lastUsedTypes(), note: "" };
      data.days[key] = entry;
      commit(store.putDay(key, entry));
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
    commit(store.putSettings(data.settings));
  });
  $("weekStartSelect").addEventListener("change", (e) => {
    data.settings.weekStart = Number(e.target.value);
    commit(store.putSettings(data.settings));
  });
  $("exportBtn").addEventListener("click", exportData);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) importData(file);
  });
  $("resetBtn").addEventListener("click", () => {
    const where = store.kind === "supabase" ? "from your account" : "on this device";
    if (!confirm(`Delete all workout history ${where}? This can't be undone.`)) return;
    data = defaultData();
    $("settingsDialog").close();
    commit(store.replaceAll(data));
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
    if (document.visibilityState !== "visible") return;
    refreshToday();
    // Pick up workouts logged on another device.
    if (store.kind === "supabase") reloadFromStore();
  });
  channel?.addEventListener("message", reloadFromStore);
  setInterval(refreshToday, 60 * 1000);

  render();
  // Installed apps ask for persistent storage up front; in a browser tab we
  // wait until the first save so we don't prompt people who are just looking.
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) requestPersistence();
}

init();
