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

// ---------- daily tasks (per-user) ----------

export async function getDailyTasks(userId, dateKey) {
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("done")
    .eq("user_id", userId)
    .eq("task_date", dateKey)
    .maybeSingle();
  if (error) throw error;
  return data?.done || {};
}

export async function saveDailyTasks(userId, dateKey, done) {
  const { error } = await supabase.from("daily_tasks").upsert({ user_id: userId, task_date: dateKey, done });
  if (error) throw error;
}

// ---------- execution report + leaderboard ----------

export async function hasReportedToday(userId, dateKey) {
  const { data, error } = await supabase
    .from("execution_reports")
    .select("user_id")
    .eq("user_id", userId)
    .eq("report_date", dateKey)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function reportExecution(userId, nickname, dateKey) {
  const { error: reportError } = await supabase
    .from("execution_reports")
    .insert({ user_id: userId, report_date: dateKey });
  if (reportError) {
    if (reportError.code === "23505") return; // already reported today
    throw reportError;
  }
  const { data: existing, error: fetchError } = await supabase
    .from("leaderboard")
    .select("count")
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  const nextCount = (existing?.count || 0) + 1;
  const { error: upsertError } = await supabase
    .from("leaderboard")
    .upsert({ user_id: userId, nickname: nickname || "未命名", count: nextCount });
  if (upsertError) throw upsertError;
}

export async function getLeaderboard() {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("nickname, count")
    .order("count", { ascending: false });
  if (error) throw error;
  return data || [];
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

// ---------- growth checklist (per-user) ----------

export async function getGrowthChecklist(userId) {
  const { data, error } = await supabase
    .from("growth_checklist")
    .select("checks")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.checks || {};
}

export async function saveGrowthChecklist(userId, checks) {
  const { error } = await supabase.from("growth_checklist").upsert({ user_id: userId, checks });
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

// ---------- publishing board (team-shared) ----------

export async function getBoard() {
  const { data, error } = await supabase
    .from("publishing_board")
    .select("id, title, status, owner_nickname")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addBoardItem(userId, title, ownerNickname) {
  const { error } = await supabase
    .from("publishing_board")
    .insert({ title, owner_nickname: ownerNickname || "未命名", owner_id: userId });
  if (error) throw error;
}

export async function moveBoardItem(id, status) {
  const { error } = await supabase.from("publishing_board").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function removeBoardItem(id) {
  const { error } = await supabase.from("publishing_board").delete().eq("id", id);
  if (error) throw error;
}
