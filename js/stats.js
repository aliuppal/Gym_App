// Pure date/streak helpers. Days are stored as local "YYYY-MM-DD" keys so that
// a workout logged at 11pm never drifts into another day because of UTC offsets.

export function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

// weekStart: 0 = Sunday, 1 = Monday
export function startOfWeek(date, weekStart = 1) {
  const diff = (date.getDay() - weekStart + 7) % 7;
  return addDays(date, -diff);
}

// Consecutive active days ending today. If today isn't logged yet the streak
// still counts from yesterday, so it doesn't look "broken" before you train.
export function currentStreak(activeSet, today) {
  let day = today;
  if (!activeSet.has(toKey(day))) day = addDays(day, -1);
  let n = 0;
  while (activeSet.has(toKey(day))) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function longestStreak(keys) {
  const sorted = [...new Set(keys)].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    run = prev && toKey(addDays(fromKey(prev), 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

// Number of active days in [start, endExclusive).
export function countBetween(keys, start, endExclusive) {
  const lo = toKey(start);
  const hi = toKey(endExclusive);
  let n = 0;
  for (const key of keys) if (key >= lo && key < hi) n++;
  return n;
}

// Consecutive weeks that met the weekly goal. The current week counts once
// the goal is hit; until then the streak is carried from the previous week.
export function weeklyGoalStreak(activeSet, today, goal, weekStart = 1) {
  if (!(goal >= 1)) return 0;
  const weekCount = (start) => {
    let n = 0;
    for (let i = 0; i < 7; i++) if (activeSet.has(toKey(addDays(start, i)))) n++;
    return n;
  };
  let week = startOfWeek(today, weekStart);
  let n = weekCount(week) >= goal ? 1 : 0;
  week = addDays(week, -7);
  while (weekCount(week) >= goal) {
    n++;
    week = addDays(week, -7);
  }
  return n;
}

export function computeStats(days, today, { weeklyGoal = 3, weekStart = 1 } = {}) {
  const keys = Object.keys(days);
  const set = new Set(keys);
  const weekStartDate = startOfWeek(today, weekStart);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const tomorrow = addDays(today, 1);
  return {
    currentStreak: currentStreak(set, today),
    longestStreak: longestStreak(keys),
    thisWeek: countBetween(keys, weekStartDate, addDays(weekStartDate, 7)),
    thisMonth: countBetween(keys, monthStart, tomorrow),
    thisYear: countBetween(keys, yearStart, tomorrow),
    total: keys.length,
    weeklyGoalStreak: weeklyGoalStreak(set, today, weeklyGoal, weekStart),
  };
}
