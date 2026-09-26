// Progress photos: pick a picture, choose which stats to print along the
// bottom, then save it to the device and/or the account's gallery
// (base64 JPEGs in the progress_photos table, see js/cloud.js).

import { fromKey } from "./stats.js";
import { isMissingTable } from "./cloud.js";
import { drawMark, drawWordmark, WORDMARK_WIDTH } from "./brand.js";

const $ = (id) => document.getElementById(id);

// `label` is what's printed under the number on the photo.
export const PHOTO_STATS = [
  { key: "streak", label: "day streak", value: (s) => s.currentStreak },
  { key: "week", label: "days this week", value: (s) => s.thisWeek },
  { key: "month", label: "days this month", value: (s) => s.thisMonth },
  { key: "year", label: "days this year", value: (s) => s.thisYear },
  { key: "longest", label: "longest streak", value: (s) => s.longestStreak },
  { key: "goalWeeks", label: "goal weeks in a row", value: (s) => s.weeklyGoalStreak },
  { key: "total", label: "total workouts", value: (s) => s.total },
];

const CHOSEN_KEY = "gym-days:photo-stats"; // storage keys keep the old name so saved choices survive
const DEFAULT_CHOSEN = ["week", "month"];
const FULL_SIDE = 1440; // longest side of the saved picture, in pixels
const THUMB_SIDE = 360;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// ---------- Drawing ----------

export async function loadImage(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to <img>, which handles a few more formats.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

// Largest font size (up to `size`) at which `text` fits in `maxWidth`.
function fitFont(ctx, text, weight, size, maxWidth) {
  let px = size;
  do {
    ctx.font = `${weight} ${px}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 1;
  } while (px > 8);
  return px;
}

// Strava-style layout, everything centered on the photo itself: the green
// "Workout Stats" title and the date, then each stat as a small label over a
// big green number, then the Gymlo mark and wordmark. A soft shadow and a
// light center shade keep the text readable on bright photos.
export function composePhoto(source, items, caption, maxSide = FULL_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, w, h);

  const shade = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
  shade.addColorStop(0, "rgba(0,0,0,0.28)");
  shade.addColorStop(1, "rgba(0,0,0,0.05)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);

  // Sizes in layout units (1% of the short side); everything shrinks together
  // if the block wouldn't fit in 90% of the photo's height.
  const TITLE = 4.4, DATE = 3.6, LABEL = 4.2, VALUE = 12, MARK = 10, WORD = 5.5;
  const statH = LABEL + 1 + VALUE + 4;
  const blockH = TITLE + 1.5 + DATE + 6 + items.length * statH + 1 + MARK + 2.5 + WORD;
  const u = Math.min(Math.min(w, h) / 100, (h * 0.9) / blockH);
  const maxW = w - 8 * u;
  let y = (h - blockH * u) / 2;

  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 1.5 * u;
  ctx.shadowOffsetY = 0.3 * u;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const text = (str, color, weight, size) => {
    ctx.fillStyle = color;
    fitFont(ctx, str, weight, Math.round(size * u), maxW);
    ctx.fillText(str, w / 2, y);
  };

  text("Workout Stats", "#22c55e", 800, TITLE);
  y += (TITLE + 1.5) * u;
  text(caption, "rgba(255,255,255,0.92)", 600, DATE);
  y += (DATE + 6) * u;
  for (const item of items) {
    text(item.label.charAt(0).toUpperCase() + item.label.slice(1), "#ffffff", 600, LABEL);
    y += (LABEL + 1) * u;
    text(String(item.value), "#22c55e", 800, VALUE);
    y += (VALUE + 4) * u;
  }
  y += 1 * u;
  drawMark(ctx, (w - MARK * u) / 2, y, MARK * u, "#22c55e");
  y += (MARK + 2.5) * u;
  const wordH = WORD * u;
  drawWordmark(ctx, (w - (WORDMARK_WIDTH * wordH) / 100) / 2, y, wordH, "#ffffff");
  return canvas;
}

function scaledCopy(canvas, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  out.getContext("2d").drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

// e.g. "gymlo-2026-09-26-173045.jpg": the local date and time of the save, so
// every download gets its own file name.
export function photoFilename(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  return `gymlo-${date}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.jpg`;
}

// Downloads the picture straight away (no share sheet).
export async function saveToDevice(dataUrl, filename) {
  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ---------- UI ----------

function loadChosen() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHOSEN_KEY));
    if (Array.isArray(saved)) return new Set(saved.filter((k) => PHOTO_STATS.some((s) => s.key === k)));
  } catch {
    // Use the defaults.
  }
  return new Set(DEFAULT_CHOSEN);
}

function saveChosen(chosen) {
  try {
    localStorage.setItem(CHOSEN_KEY, JSON.stringify([...chosen]));
  } catch {
    // Not remembered; harmless.
  }
}

const formatDay = (key) =>
  fromKey(key).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const formatCaption = (key) =>
  fromKey(key).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ctx: { getStore, isSignedIn, getStats, todayKey, toast }
//   getStats() -> { stats, weeklyGoal } for right now
export function initPhotos(ctx) {
  let source = null; // the picked image
  let chosen = loadChosen();
  let photos = [];
  let viewing = null; // row shown in the viewer
  const cloud = () => ctx.isSignedIn();

  function statItems() {
    const { stats, weeklyGoal } = ctx.getStats();
    return PHOTO_STATS.filter((s) => chosen.has(s.key)).map((s) => ({
      key: s.key,
      label: s.label,
      value: String(s.value(stats, weeklyGoal)),
    }));
  }

  function renderPreview() {
    if (!source) return;
    const composed = composePhoto(source, statItems(), formatCaption(ctx.todayKey()), 900);
    const preview = $("photoCanvas");
    preview.width = composed.width;
    preview.height = composed.height;
    preview.getContext("2d").drawImage(composed, 0, 0);
  }

  function buildChips() {
    const fieldset = $("photoStatChips");
    for (const s of PHOTO_STATS) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.key = s.key;
      chip.textContent = s.label.charAt(0).toUpperCase() + s.label.slice(1);
      chip.setAttribute("aria-pressed", String(chosen.has(s.key)));
      chip.addEventListener("click", () => {
        if (chosen.has(s.key)) chosen.delete(s.key);
        else chosen.add(s.key);
        chip.setAttribute("aria-pressed", String(chosen.has(s.key)));
        saveChosen(chosen);
        renderPreview();
      });
      fieldset.append(chip);
    }
  }

  function finalImage() {
    return composePhoto(source, statItems(), formatCaption(ctx.todayKey()));
  }

  async function openEditor(file) {
    try {
      source = await loadImage(file);
    } catch (err) {
      console.error(err);
      ctx.toast("Couldn't open that picture — try a JPEG or PNG");
      return;
    }
    $("photoSave").hidden = !cloud();
    $("photoSave").disabled = false;
    $("photoSave").textContent = "Save to gallery";
    $("photoEditorNote").textContent = cloud()
      ? "Saved photos appear in your gallery on every device you sign in on."
      : "Sign in to keep photos in a gallery. You can still save this one to your device.";
    renderPreview();
    $("photoDialog").showModal();
  }

  async function downloadNew() {
    try {
      await saveToDevice(finalImage().toDataURL("image/jpeg", 0.9), photoFilename());
      ctx.toast("✓ Photo saved to your device", 1500);
    } catch (err) {
      console.error(err);
      ctx.toast("Couldn't save the picture");
    }
  }

  async function saveToGallery() {
    const btn = $("photoSave");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const full = finalImage();
      const row = await ctx.getStore().addPhoto({
        takenOn: ctx.todayKey(),
        image: full.toDataURL("image/jpeg", 0.82),
        thumbnail: scaledCopy(full, THUMB_SIDE).toDataURL("image/jpeg", 0.7),
        stats: statItems(),
      });
      photos.unshift(row);
      renderGrid();
      $("photoDialog").close();
      ctx.toast("✓ Photo saved to your gallery", 1500);
    } catch (err) {
      console.error(err);
      ctx.toast(isMissingTable(err)
        ? "Photo gallery isn't set up in Supabase yet"
        : "Couldn't save the photo — check your connection");
      btn.disabled = false;
      btn.textContent = "Save to gallery";
    }
  }

  function renderGrid(message) {
    const grid = $("photoGrid");
    const tiles = photos.map((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "photo-tile";
      btn.dataset.id = p.id;
      const img = document.createElement("img");
      img.src = p.thumbnail;
      img.alt = "";
      img.loading = "lazy";
      const label = document.createElement("span");
      label.textContent = formatDay(p.taken_on);
      btn.setAttribute("aria-label", `Progress photo from ${label.textContent}`);
      btn.append(img, label);
      return btn;
    });
    grid.replaceChildren(...tiles);
    grid.hidden = tiles.length === 0;
    let hint = message;
    if (!hint) {
      if (!cloud()) hint = "Add a photo to put your stats on it. Sign in to keep a gallery of your progress.";
      else if (!photos.length) hint = "No photos yet. Add one to track your progress with your stats on it.";
      else hint = "Tap a photo to view it with its stats.";
    }
    $("photoHint").textContent = hint;
  }

  async function loadGallery() {
    if (!cloud()) {
      renderGrid();
      return;
    }
    $("photoHint").textContent = "Loading photos…";
    try {
      photos = await ctx.getStore().listPhotos();
      renderGrid();
    } catch (err) {
      console.error(err);
      renderGrid(isMissingTable(err)
        ? "The photo gallery isn't set up yet: run supabase/migrations/20260927000000_progress_photos.sql in the Supabase SQL Editor."
        : "Couldn't load your photos — check your connection.");
    }
  }

  async function openViewer(id) {
    const row = photos.find((p) => p.id === id);
    if (!row) return;
    viewing = { ...row, image: null };
    $("viewerTitle").textContent = formatDay(row.taken_on);
    $("viewerImage").src = row.thumbnail; // sharp copy replaces it below
    const stats = row.stats.map((s) => {
      const li = document.createElement("li");
      const value = document.createElement("strong");
      value.textContent = s.value;
      li.append(value, ` ${s.label}`);
      return li;
    });
    $("viewerStats").replaceChildren(...stats);
    $("viewerStats").hidden = stats.length === 0;
    $("viewerDownload").disabled = true;
    $("viewerDelete").disabled = false;
    $("photoViewer").showModal();
    try {
      const full = await ctx.getStore().getPhoto(id);
      if (viewing?.id !== id) return;
      viewing.image = full.image;
      $("viewerImage").src = full.image;
      $("viewerDownload").disabled = false;
    } catch (err) {
      console.error(err);
      ctx.toast("Couldn't load the full-size photo");
    }
  }

  async function deleteViewing() {
    if (!viewing || !confirm("Delete this photo? This can't be undone.")) return;
    $("viewerDelete").disabled = true;
    try {
      await ctx.getStore().deletePhoto(viewing.id);
      photos = photos.filter((p) => p.id !== viewing.id);
      renderGrid();
      $("photoViewer").close();
      ctx.toast("Photo deleted");
    } catch (err) {
      console.error(err);
      $("viewerDelete").disabled = false;
      ctx.toast("Couldn't delete the photo — check your connection");
    }
  }

  buildChips();
  $("addPhotoBtn").addEventListener("click", () => $("photoFile").click());
  $("photoFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) openEditor(file);
  });
  $("photoForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveToGallery();
  });
  $("photoCancel").addEventListener("click", () => $("photoDialog").close());
  $("photoDownload").addEventListener("click", downloadNew);
  $("photoGrid").addEventListener("click", (e) => {
    const tile = e.target.closest(".photo-tile");
    if (tile) openViewer(tile.dataset.id);
  });
  $("viewerDownload").addEventListener("click", () => {
    if (viewing?.image) {
      saveToDevice(viewing.image, photoFilename()).then(
        () => ctx.toast("✓ Photo saved to your device", 1500),
        () => ctx.toast("Couldn't save the picture"),
      );
    }
  });
  $("viewerDelete").addEventListener("click", deleteViewing);
  $("photoViewer").addEventListener("close", () => {
    viewing = null;
  });

  loadGallery();
  return { reload: loadGallery };
}
