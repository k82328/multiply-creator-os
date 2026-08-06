import { supabase } from "./supabaseClient";

// ---------- profile (per-user; includes nickname, is_admin, email) ----------

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

// ---------- global settings (admin-editable targets) ----------

export async function getSettings() {
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data || { daily_story_target: 5, weekly_video_target: 1, weekly_post_target: 1 };
}

export async function updateSettings(fields) {
  const { error } = await supabase
    .from("app_settings")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

// ---------- daily reports (per-user; admins can read all) ----------

export async function getDailyReport(userId, date) {
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertDailyReport(userId, date, fields) {
  const { error } = await supabase
    .from("daily_reports")
    .upsert({ user_id: userId, report_date: date, ...fields, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function getAllDailyReportsForDate(date) {
  const { data, error } = await supabase.from("daily_reports").select("*").eq("report_date", date);
  if (error) throw error;
  return data || [];
}

export async function getDailyReportsForRange(userId, startDate, endDate) {
  const { data, error } = await supabase
    .from("daily_reports")
    .select("report_date, stories_count, inquiries_count, bookings_count, technical_revenue, retail_revenue")
    .eq("user_id", userId)
    .gte("report_date", startDate)
    .lte("report_date", endDate);
  if (error) throw error;
  return data || [];
}

// ---------- weekly reports (per-user; admins can read all) ----------

export async function getWeeklyReport(userId, weekStart) {
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertWeeklyReport(userId, weekStart, fields) {
  const { error } = await supabase
    .from("weekly_reports")
    .upsert({ user_id: userId, week_start: weekStart, ...fields, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function getAllWeeklyReportsForWeek(weekStart) {
  const { data, error } = await supabase.from("weekly_reports").select("*").eq("week_start", weekStart);
  if (error) throw error;
  return data || [];
}

export async function getWeeklyReportsForRange(userId, startDate, endDate) {
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("week_start, videos_count, posts_count")
    .eq("user_id", userId)
    .gte("week_start", startDate)
    .lte("week_start", endDate);
  if (error) throw error;
  return data || [];
}

// ---------- admin: designer roster ----------

export async function getAllDesignerProfiles() {
  const { data, error } = await supabase.from("profiles").select("id, email, is_admin");
  if (error) throw error;
  return (data || []).filter((p) => !p.is_admin);
}
