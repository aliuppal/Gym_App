export const WORKOUT_TYPES = ["Strength", "Cardio", "HIIT", "Mobility", "Sports", "Other"];

// Optional details for each workout type. Names are unique across types, so a
// day's details can be stored as one flat list.
export const WORKOUT_DETAILS = {
  Strength: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Glutes", "Core", "Full body"],
  Cardio: ["Running", "Treadmill", "Cycling", "Rowing", "Elliptical", "Stair climber", "Swimming", "Walking"],
  HIIT: ["Circuit", "Tabata", "Sprints", "Kettlebell", "Jump rope", "Burpees", "CrossFit"],
  Mobility: ["Stretching", "Yoga", "Pilates", "Foam rolling"],
  Sports: ["Football", "Cricket", "Basketball", "Tennis", "Badminton", "Padel", "Martial arts"],
  Other: ["Hiking", "Dance", "Climbing", "Boxing"],
};

// Keeps only details that belong to the day's types, in the order listed above.
export function normalizeDetails(details, types) {
  const raw = Array.isArray(details) ? details : [];
  return types.flatMap((t) => WORKOUT_DETAILS[t].filter((d) => raw.includes(d)));
}

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
      const types = normalizeTypes(entry);
      data.days[key] = {
        types,
        details: normalizeDetails(entry.details, types),
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
