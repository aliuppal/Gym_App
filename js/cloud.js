// Cloud database (Supabase) and Google sign-in. The store below has the same
// interface as the on-device stores in db.js, so app.js doesn't care which
// one it's talking to.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { normalize } from "./storage.js";

const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let clientPromise = null;

// Loaded on demand so the app still opens (in on-device mode) when the
// library can't be fetched.
export function getClient() {
  clientPromise ??= import(SUPABASE_JS).then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return clientPromise;
}

// Resolves once any OAuth redirect in the URL has been exchanged for a session.
export async function getUser() {
  const supabase = await getClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function signInWithGoogle() {
  const supabase = await getClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    // Come back to this exact page (works on localhost and on GitHub Pages' /Gym_App/ path).
    options: { redirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = await getClient();
  await supabase.auth.signOut();
}

export async function onAuthChange(callback) {
  const supabase = await getClient();
  supabase.auth.onAuthStateChange((event, session) => callback(event, session?.user ?? null));
}

const check = ({ error }) => {
  if (error) throw error;
};

export class SupabaseStore {
  kind = "supabase";

  constructor(supabase, user) {
    this.supabase = supabase;
    this.user = user;
  }

  async load() {
    const [days, settings] = await Promise.all([
      this.supabase.from("workout_days").select("date, types, details, note"),
      this.supabase.from("user_settings").select("weekly_goal, week_start").maybeSingle(),
    ]);
    check(days);
    check(settings);
    const data = { days: {}, settings: {} };
    for (const { date, types, details, note } of days.data) data.days[date] = { types, details, note };
    if (settings.data) {
      data.settings = { weeklyGoal: settings.data.weekly_goal, weekStart: settings.data.week_start };
    }
    return normalize(data);
  }

  async putDay(date, entry) {
    check(
      await this.supabase
        .from("workout_days")
        .upsert({
          user_id: this.user.id,
          date,
          types: entry.types,
          details: entry.details,
          note: entry.note,
          updated_at: new Date().toISOString(),
        }),
    );
  }

  async deleteDay(date) {
    check(await this.supabase.from("workout_days").delete().eq("user_id", this.user.id).eq("date", date));
  }

  async putSettings(settings) {
    check(
      await this.supabase.from("user_settings").upsert({
        user_id: this.user.id,
        weekly_goal: settings.weeklyGoal,
        week_start: settings.weekStart,
        updated_at: new Date().toISOString(),
      }),
    );
  }

  // Atomic on the server (see replace_all_data in supabase/migrations).
  async replaceAll(data) {
    const days = Object.entries(data.days).map(([date, entry]) => ({ date, ...entry }));
    check(await this.supabase.rpc("replace_all_data", { p_days: days, p_settings: data.settings }));
  }

  // ---- Progress photos (base64 data URLs in the progress_photos table) ----

  // Newest first, without the full-size image so the gallery loads quickly.
  async listPhotos() {
    const res = await this.supabase
      .from("progress_photos")
      .select("id, taken_on, created_at, thumbnail, stats")
      .order("created_at", { ascending: false });
    check(res);
    return res.data;
  }

  async getPhoto(id) {
    const res = await this.supabase
      .from("progress_photos")
      .select("id, taken_on, created_at, image, stats")
      .eq("id", id)
      .single();
    check(res);
    return res.data;
  }

  async addPhoto({ takenOn, image, thumbnail, stats }) {
    const res = await this.supabase
      .from("progress_photos")
      .insert({ user_id: this.user.id, taken_on: takenOn, image, thumbnail, stats })
      .select("id, taken_on, created_at, thumbnail, stats")
      .single();
    check(res);
    return res.data;
  }

  async deletePhoto(id) {
    check(await this.supabase.from("progress_photos").delete().eq("id", id));
  }
}

// True when the progress_photos table hasn't been created yet
// (supabase/migrations/20260927000000_progress_photos.sql).
export function isMissingTable(err) {
  return err?.code === "PGRST205" || err?.code === "42P01";
}

export async function openCloudStore(user) {
  return new SupabaseStore(await getClient(), user);
}
