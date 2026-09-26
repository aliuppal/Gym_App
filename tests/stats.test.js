import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toKey, fromKey, addDays, startOfWeek, currentStreak, longestStreak,
  countBetween, weeklyGoalStreak, computeStats,
} from "../js/stats.js";
import { normalize, normalizeDetails } from "../js/storage.js";

const d = (key) => fromKey(key);
const set = (...keys) => new Set(keys);

test("toKey/fromKey round-trip and pad", () => {
  assert.equal(toKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(toKey(fromKey("2026-12-31")), "2026-12-31");
});

test("addDays crosses month, year and DST boundaries", () => {
  assert.equal(toKey(addDays(d("2026-01-31"), 1)), "2026-02-01");
  assert.equal(toKey(addDays(d("2026-12-31"), 1)), "2027-01-01");
  assert.equal(toKey(addDays(d("2026-03-08"), 1)), "2026-03-09");
  assert.equal(toKey(addDays(d("2026-11-01"), -1)), "2026-10-31");
});

test("startOfWeek honours Monday and Sunday starts", () => {
  // 2026-09-25 is a Friday.
  assert.equal(toKey(startOfWeek(d("2026-09-25"), 1)), "2026-09-21");
  assert.equal(toKey(startOfWeek(d("2026-09-25"), 0)), "2026-09-20");
  assert.equal(toKey(startOfWeek(d("2026-09-20"), 1)), "2026-09-14");
  assert.equal(toKey(startOfWeek(d("2026-09-20"), 0)), "2026-09-20");
});

test("currentStreak counts through today, or from yesterday if today not logged", () => {
  const today = d("2026-09-25");
  assert.equal(currentStreak(set("2026-09-23", "2026-09-24", "2026-09-25"), today), 3);
  assert.equal(currentStreak(set("2026-09-23", "2026-09-24"), today), 2);
  assert.equal(currentStreak(set("2026-09-22", "2026-09-23"), today), 0);
  assert.equal(currentStreak(set(), today), 0);
});

test("longestStreak finds the longest consecutive run", () => {
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak(["2026-01-01"]), 1);
  assert.equal(
    longestStreak(["2026-01-05", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-04"]),
    4,
  );
});

test("countBetween is start-inclusive, end-exclusive", () => {
  const keys = ["2026-09-01", "2026-09-15", "2026-09-30", "2026-10-01"];
  assert.equal(countBetween(keys, d("2026-09-01"), d("2026-10-01")), 3);
});

test("weeklyGoalStreak counts consecutive goal weeks", () => {
  const today = d("2026-09-25"); // Friday, week starts Mon 09-21
  const active = set(
    "2026-09-07", "2026-09-09", "2026-09-11", // week of 09-07: 3
    "2026-09-14", "2026-09-16", "2026-09-18", // week of 09-14: 3
    "2026-09-22", // current week: 1 so far
  );
  assert.equal(weeklyGoalStreak(active, today, 3, 1), 2);
  active.add("2026-09-23");
  active.add("2026-09-24");
  assert.equal(weeklyGoalStreak(active, today, 3, 1), 3);
  assert.equal(weeklyGoalStreak(active, today, 4, 1), 0);
  assert.equal(weeklyGoalStreak(active, today, 0, 1), 0);
});

test("computeStats aggregates everything", () => {
  const days = Object.fromEntries(
    ["2025-12-31", "2026-09-01", "2026-09-21", "2026-09-22", "2026-09-24", "2026-09-25"].map((k) => [k, { types: ["Strength"], note: "" }]),
  );
  const stats = computeStats(days, d("2026-09-25"), { weeklyGoal: 3, weekStart: 1 });
  assert.deepEqual(stats, {
    currentStreak: 2,
    longestStreak: 2,
    thisWeek: 4,
    thisMonth: 5,
    thisYear: 5,
    total: 6,
    weeklyGoalStreak: 1,
  });
});

test("normalize drops junk and clamps settings", () => {
  const data = normalize({
    days: {
      "2026-09-25": { types: ["Cardio", "Strength", "Bogus"], note: "run" },
      "bad-key": {},
      "2026-09-24": { types: ["???"] },
      "2026-09-23": { types: [] },
    },
    settings: { weeklyGoal: 12, weekStart: 0 },
  });
  assert.deepEqual(data.days, {
    "2026-09-25": { types: ["Strength", "Cardio"], details: [], note: "run" },
    "2026-09-24": { types: ["Other"], details: [], note: "" },
    "2026-09-23": { types: ["Other"], details: [], note: "" },
  });
  assert.deepEqual(data.settings, { weeklyGoal: 3, weekStart: 0 });
  assert.deepEqual(normalize(null).days, {});
});

test("normalize migrates legacy single-type entries", () => {
  const data = normalize({ days: { "2026-09-20": { type: "HIIT", note: "" }, "2026-09-21": { type: "nope" } } });
  assert.deepEqual(data.days["2026-09-20"].types, ["HIIT"]);
  assert.deepEqual(data.days["2026-09-21"].types, ["Other"]);
});

test("normalizeDetails keeps only details of the chosen types, in list order", () => {
  assert.deepEqual(
    normalizeDetails(["Legs", "Cycling", "Yoga", "Biceps", "Legs", "bogus"], ["Strength", "Cardio"]),
    ["Biceps", "Legs", "Cycling"],
  );
  assert.deepEqual(normalizeDetails(undefined, ["HIIT"]), []);
  const data = normalize({ days: { "2026-09-20": { types: ["Cardio"], details: ["Treadmill", "Chest"] } } });
  assert.deepEqual(data.days["2026-09-20"].details, ["Treadmill"]);
});
