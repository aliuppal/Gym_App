const STORAGE_KEY = "gym-tracker:v1";

export const WORKOUT_TYPES = ["Strength", "Cardio", "HIIT", "Mobility", "Sports", "Other"];

export function defaultData() {
  return { version: 1, days: {}, settings: { weeklyGoal: 3, weekStart: 1 } };
}

// Entries saved before multi-select stored a single `type` string.
function normalizeTypes(entry) {
  const raw = Array.isArray(entry.types) ? entry.types : [entry.type];
  const types = WORKOUT_TYPES.filter((t) => raw.includes(t));
  return types.length ? types : ["Other"];
}

// Accepts anything (e.g. an imported file) and returns a well-formed data object,
// dropping entries that don't look like valid day records.
export function normalize(raw) {
  const data = defaultData();
  if (!raw || typeof raw !== "object") return data;
  if (raw.days && typeof raw.days === "object") {
    for (const [key, value] of Object.entries(raw.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const entry = value && typeof value === "object" ? value : {};
      data.days[key] = {
        types: normalizeTypes(entry),
        note: typeof entry.note === "string" ? entry.note.slice(0, 500) : "",
      };
    }
  }
  const s = raw.settings || {};
  const goal = Number(s.weeklyGoal);
  if (Number.isInteger(goal) && goal >= 1 && goal <= 7) data.settings.weeklyGoal = goal;
  if (s.weekStart === 0 || s.weekStart === 1) data.settings.weekStart = s.weekStart;
  return data;
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : defaultData();
  } catch {
    return defaultData();
  }
}

export function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
