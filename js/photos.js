// Progress photos: pick a picture, choose which stats to print along the
// bottom, then save it to the device and/or the account's gallery
// (base64 JPEGs in the progress_photos table, see js/cloud.js).

import { fromKey } from "./stats.js";
import { isMissingTable } from "./cloud.js";

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

const CHOSEN_KEY = "gym-days:photo-stats";
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

// Draws `source` scaled to fit `maxSide`, with a dark band along the bottom
// holding the caption and one column per stat (two rows when there are many).
export function composePhoto(source, items, caption, maxSide = FULL_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, w, h);

  const u = Math.min(w, h) / 100; // layout unit: 1% of the short side
  const pad = 4 * u;
  const captionH = 5 * u;
  const tileH = items.length ? 14 * u : 0;
  const perRow = items.length <= 4 ? items.length : Math.ceil(items.length / 2);
  const rows = items.length ? Math.ceil(items.length / perRow) : 0;
  const bandH = pad + captionH + rows * tileH + pad;

  const shade = ctx.createLinearGradient(0, h - bandH - 10 * u, 0, h);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.35, "rgba(0,0,0,0.55)");
  shade.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, h - bandH - 10 * u, w, bandH + 10 * u);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = h - bandH + pad + captionH * 0.75;
  const title = "Workout Stats";
  ctx.fillStyle = "#22c55e";
  fitFont(ctx, title, 700, Math.round(3.6 * u), w - 2 * pad);
  ctx.fillText(title, pad, y);
  const brandW = ctx.measureText(`${title} · `).width;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("·", pad + ctx.measureText(`${title} `).width, y);
  fitFont(ctx, caption, 500, Math.round(3.4 * u), w - 2 * pad - brandW);
  ctx.fillText(caption, pad + brandW, y);

  ctx.textAlign = "center";
  const colW = (w - 2 * pad) / Math.max(perRow, 1);
  items.forEach((item, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, items.length - row * perRow);
    // Center a short last row.
    const rowLeft = pad + ((perRow - inRow) * colW) / 2;
    const x = rowLeft + ((i % perRow) + 0.5) * colW;
    const top = h - bandH + pad + captionH + row * tileH;
    ctx.fillStyle = "#22c55e";
    fitFont(ctx, String(item.value), 800, Math.round(7.5 * u), colW - 2 * u);
    ctx.fillText(String(item.value), x, top + 8 * u);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    fitFont(ctx, item.label, 500, Math.round(3.2 * u), colW - 2 * u);
    ctx.fillText(item.label, x, top + 12 * u);
  });
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

// Phones get the share sheet (which offers "Save Image" / "Save to Photos");
// computers get a normal download.
export async function saveToDevice(dataUrl, filename) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      await saveToDevice(finalImage().toDataURL("image/jpeg", 0.9), `gym-days-${ctx.todayKey()}.jpg`);
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
      ctx.toast("Photo saved to your gallery");
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
      saveToDevice(viewing.image, `gym-days-${viewing.taken_on}.jpg`).catch(() => ctx.toast("Couldn't save the picture"));
    }
  });
  $("viewerDelete").addEventListener("click", deleteViewing);
  $("photoViewer").addEventListener("close", () => {
    viewing = null;
  });

  loadGallery();
  return { reload: loadGallery };
}
