import { supabase } from "./supabaseClient";

// ---------- profile (per-user; includes nickname) ----------

export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(userId, fields) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...fields, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---------- analytics history (per-user) ----------

export async function getAnalyticsHistory(userId) {
  const { data, error } = await supabase
    .from("analytics_history")
    .select("week, values")
    .eq("user_id", userId)
    .order("week", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveAnalyticsWeek(userId, week, values) {
  const { error } = await supabase
    .from("analytics_history")
    .upsert({ user_id: userId, week, values }, { onConflict: "user_id,week" });
  if (error) throw error;
}
