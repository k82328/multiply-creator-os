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

// ---------- content calendar (team-shared) ----------

export async function getCalendarMonth(year, month) {
  const { data, error } = await supabase
    .from("content_calendar")
    .select("day, topic")
    .eq("year", year)
    .eq("month", month);
  if (error) throw error;
  const map = {};
  (data || []).forEach((r) => {
    map[r.day] = r.topic;
  });
  return map;
}

export async function saveCalendarDay(userId, year, month, day, topic) {
  if (topic && topic.trim()) {
    const { error } = await supabase
      .from("content_calendar")
      .upsert({ year, month, day, topic: topic.trim(), updated_by: userId, updated_at: new Date().toISOString() });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("content_calendar")
      .delete()
      .eq("year", year)
      .eq("month", month)
      .eq("day", day);
    if (error) throw error;
  }
}

// ---------- tag lists (team-shared: content-categories / pain-points / service-topics) ----------

export async function getTagList(listKey) {
  const { data, error } = await supabase
    .from("tag_items")
    .select("id, label")
    .eq("list_key", listKey)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addTagItem(userId, listKey, label) {
  const { error } = await supabase.from("tag_items").insert({ list_key: listKey, label, created_by: userId });
  if (error) throw error;
}

export async function removeTagItem(id) {
  const { error } = await supabase.from("tag_items").delete().eq("id", id);
  if (error) throw error;
}
