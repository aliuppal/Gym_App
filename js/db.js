// On-device database. Workout days and settings live in IndexedDB, which is
// sized for real app data and survives app restarts and offline use. If the
// browser has no IndexedDB (e.g. some private-browsing modes) we fall back to
// localStorage so the app still works.

import { defaultData, normalize } from "./storage.js";

const DB_NAME = "gym-days";
const DB_VERSION = 1;
const DAYS = "days"; // one record per active day: { date: "YYYY-MM-DD", types, details, note }
const META = "meta"; // key/value records, currently just "settings"
const LEGACY_KEY = "gym-tracker:v1"; // where versions before the database kept everything

const request = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const done = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });

function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DAYS)) db.createObjectStore(DAYS, { keyPath: "date" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => {
      const db = req.result;
      // Let a newer version of the app (open in another tab) upgrade the schema.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("Database upgrade blocked by another open tab"));
  });
}

class IndexedDBStore {
  kind = "indexeddb";

  constructor(db) {
    this.db = db;
  }

  async load() {
    const tx = this.db.transaction([DAYS, META], "readonly");
    const [rows, settings] = await Promise.all([
      request(tx.objectStore(DAYS).getAll()),
      request(tx.objectStore(META).get("settings")),
    ]);
    const days = {};
    for (const { date, ...entry } of rows) days[date] = entry;
    return normalize({ days, settings });
  }

  async putDay(date, entry) {
    const tx = this.db.transaction(DAYS, "readwrite");
    tx.objectStore(DAYS).put({ date, ...entry });
    await done(tx);
  }

  async deleteDay(date) {
    const tx = this.db.transaction(DAYS, "readwrite");
    tx.objectStore(DAYS).delete(date);
    await done(tx);
  }

  async putSettings(settings) {
    const tx = this.db.transaction(META, "readwrite");
    tx.objectStore(META).put(settings, "settings");
    await done(tx);
  }

  // Atomically replaces everything (used by import and "delete all data").
  async replaceAll(data) {
    const tx = this.db.transaction([DAYS, META], "readwrite");
    const days = tx.objectStore(DAYS);
    days.clear();
    for (const [date, entry] of Object.entries(data.days)) days.put({ date, ...entry });
    tx.objectStore(META).put(data.settings, "settings");
    await done(tx);
  }

  // One-time move of data saved by earlier versions into the database.
  // Days already in the database win; the old copy is removed only after
  // the merged data has been committed.
  async migrateLegacy() {
    let raw;
    try {
      raw = localStorage.getItem(LEGACY_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let legacy;
    try {
      legacy = normalize(JSON.parse(raw));
    } catch {
      return;
    }
    const tx = this.db.transaction(META, "readonly");
    const hasSettings = (await request(tx.objectStore(META).get("settings"))) !== undefined;
    const current = await this.load();
    await this.replaceAll({
      ...current,
      days: { ...legacy.days, ...current.days },
      settings: hasSettings ? current.settings : legacy.settings,
    });
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // Harmless: the merge above is idempotent, so a retry next launch is fine.
    }
  }
}

class LocalStorageStore {
  kind = "localstorage";

  async load() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      this.data = raw ? normalize(JSON.parse(raw)) : defaultData();
    } catch {
      this.data = defaultData();
    }
    return structuredClone(this.data);
  }

  #write() {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(this.data));
  }

  async putDay(date, entry) {
    this.data.days[date] = entry;
    this.#write();
  }

  async deleteDay(date) {
    delete this.data.days[date];
    this.#write();
  }

  async putSettings(settings) {
    this.data.settings = { ...settings };
    this.#write();
  }

  async replaceAll(data) {
    this.data = structuredClone(data);
    this.#write();
  }
}

export async function openStore() {
  if (typeof indexedDB !== "undefined") {
    try {
      const store = new IndexedDBStore(await openDatabase());
      await store.migrateLegacy();
      return store;
    } catch (err) {
      console.warn("IndexedDB unavailable, falling back to localStorage", err);
    }
  }
  return new LocalStorageStore();
}

// Asks the browser to exempt this app's data from automatic cleanup when the
// device is low on space. Installed apps are usually granted this silently.
// Resolves to true (persistent), false (best-effort) or null (unsupported).
export async function requestPersistence() {
  if (!navigator.storage?.persist) return null;
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

export async function isPersisted() {
  if (!navigator.storage?.persisted) return null;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}
