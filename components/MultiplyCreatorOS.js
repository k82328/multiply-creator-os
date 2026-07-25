"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import { useRouter } from "next/navigation";
import {
  Target, Bot, Video, CalendarCheck2, BarChart3, GraduationCap,
  Users, BookOpen, Link2, ArrowRight, ChevronLeft, Sparkles,
  Wand2, Copy, Check, RefreshCw, Loader2, MessageSquareText,
  Plus, X, CalendarDays, Image as ImageIcon, Trophy, ChevronRight as ChevronRightIcon,
  LogOut,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { callClaude } from "../lib/claude";
import { UserIdContext, useUserId } from "../lib/UserIdContext";
import {
  getProfile, upsertProfile,
  getDailyTasks, saveDailyTasks,
  hasReportedToday, reportExecution as reportExecutionApi, getLeaderboard,
  getAnalyticsHistory, saveAnalyticsWeek,
  getGrowthChecklist, saveGrowthChecklist,
  getCalendarMonth, saveCalendarDay,
  getTagList, addTagItem, removeTagItem,
  getBoard, addBoardItem, moveBoardItem, removeBoardItem,
} from "../lib/data";

const TOKENS = {
  bg: "#131209", bgElev: "#1C1A12", bgCard: "#211E15",
  ink: "#F1EADA", inkDim: "#A79A80", inkFaint: "#6E6552",
  line: "#39321F", gold: "#C9A063", goldDim: "#8A7047",
};

const LAYERS = [
  { n: "01", key: "strategy", name: "內容策略系統", en: "Content Strategy System", icon: Target,
    problem: "我今天要發什麼？",
    core: "這一層的核心不是「題庫」，而是讓每位設計師知道：對誰說、說什麼、為什麼值得看、最後要引導什麼。",
    features: ["每日內容題目", "月度內容行事曆", "內容分類", "客群痛點資料庫", "服務主題資料庫", "爆款案例拆解", "品牌內容方向", "個人定位設定", "成功內容模板"], live: true },
  { n: "02", key: "ai", name: "AI 社群助理", en: "AI Content Assistant", icon: Bot,
    problem: "我知道要發什麼，但我不會寫、不會規劃。",
    core: "這樣 AI 產出的內容才不會每個人都一樣——每位設計師都需要建立自己的個人資料。",
    features: ["AI 主題生成", "AI 三秒鉤子", "AI Reels 腳本", "AI IG 文案", "AI Threads 文案", "AI 限動腳本", "AI CTA", "AI 標題", "AI Hashtag", "AI 語氣調整", "AI 內容改寫"], live: true },
  { n: "03", key: "production", name: "內容製作系統", en: "Content Production System", icon: Video,
    problem: "我有內容，但製作很慢。",
    core: "不只是影片剪輯系統，影片剪輯只是其中一個模組。",
    features: ["AI 自動剪停頓", "自動字幕", "自動裁切 9:16", "人臉追蹤", "自動放大", "關鍵字強調", "品牌字幕模板", "Logo 與片尾", "封面模板", "輪播圖模板", "限動模板", "素材庫", "B-roll 資料庫"], live: true },
  { n: "04", key: "publishing", name: "發布與執行系統", en: "Publishing & Execution System", icon: CalendarCheck2,
    problem: "內容做完了，但沒有穩定發布。",
    core: "很多設計師的問題不是不會，而是沒有固定執行。",
    features: ["內容行事曆", "發布提醒", "草稿管理", "審核流程", "發布狀態", "每日任務", "每週任務", "主管審核", "團隊執行率", "社群挑戰", "排行榜"], live: true },
  { n: "05", key: "analytics", name: "數據與轉換系統", en: "Performance & Conversion Analytics", icon: BarChart3,
    problem: "我發了，但不知道有沒有用。",
    core: "不能只看流量，最重要的是要串到：社群內容 → 私訊 → 預約 → 到店 → 成交 → 回購。",
    features: ["觀看數", "完播率", "收藏率", "分享率", "留言率", "粉絲成長", "私訊詢問", "預約人數", "社群成交率", "社群營收", "內容類型分析", "個人趨勢分析", "團隊比較"], live: true },
  { n: "06", key: "growth", name: "成長與教育系統", en: "Creator Growth System", icon: GraduationCap,
    problem: "設計師如何持續變強？",
    core: "透過分級制度，讓成長路徑看得見。",
    features: ["社群能力分級", "學習課程", "任務驗收", "成長地圖", "個人能力評估", "每月社群診斷", "優秀案例學習", "主管回饋", "一對一輔導紀錄", "成長徽章與晉級條件"], live: true },
];

const BASE_MODULES = [
  { name: "使用者與權限", icon: Users, items: ["設計師", "主管", "教育長", "行銷人員", "管理員"], note: "每個角色看到的內容不同。" },
  { name: "品牌知識庫", icon: BookOpen, items: ["品牌定位", "語氣規範", "服務內容", "顧客痛點", "禁用詞", "成功案例", "過去內容", "SOP"], note: "這是 AI 能不能產出「像 MULTIPLY」內容的關鍵。" },
  { name: "資料整合", icon: Link2, items: ["Instagram", "Threads", "TikTok", "LINE", "預約系統", "Google Calendar", "Notion", "CRM", "業績系統"], note: "未來可以串接的外部系統。" },
];

const CYCLE = ["找到題目", "產出內容", "製作素材", "發布執行", "追蹤成效", "優化成長"];

const CONTENT_TYPES = [
  { id: "topic", label: "AI 主題生成", placeholder: "本週想聚焦的方向（可留空，AI 會依你的服務與客群發想）", optional: true },
  { id: "hook", label: "AI 三秒鉤子", placeholder: "這篇內容想圍繞什麼主題或服務？" },
  { id: "reels", label: "AI Reels 腳本", placeholder: "想拍的主題、服務或客群痛點" },
  { id: "ig", label: "AI IG 文案", placeholder: "這篇貼文想傳達的重點" },
  { id: "threads", label: "AI Threads 文案", placeholder: "這則貼文想聊的話題" },
  { id: "story", label: "AI 限動腳本", placeholder: "這則限動想呈現的內容" },
  { id: "cta", label: "AI CTA", placeholder: "想引導客人採取什麼行動？" },
  { id: "title", label: "AI 標題", placeholder: "這篇內容的主題或服務" },
  { id: "hashtag", label: "AI Hashtag", placeholder: "這篇內容的主題或服務" },
  { id: "tone", label: "AI 語氣調整", placeholder: "貼上想調整語氣的原始文案", needsSource: true },
  { id: "rewrite", label: "AI 內容改寫", placeholder: "貼上想改寫的原始文案", needsSource: true },
];

const PROFILE_FIELDS = [
  { key: "service", label: "擅長服務", placeholder: "例如：韓系質感染燙、頭皮護理" },
  { key: "audience", label: "目標客群", placeholder: "例如：25-35 歲上班族女性" },
  { key: "tone", label: "個人語氣", placeholder: "例如：親切直接、專業穩重" },
  { key: "price", label: "客單價", placeholder: "例如：中高價位" },
  { key: "trait", label: "個人特色", placeholder: "例如：擅長溝通、會拆解髮質問題" },
  { key: "avoid", label: "不想使用的詞彙", placeholder: "例如：最便宜、網美必去" },
];

const EMPTY_PROFILE = { service: "", audience: "", tone: "", price: "", trait: "", avoid: "" };

const PRODUCTION_TYPES = [
  { id: "cover", label: "封面模板文案", hint: "想放在封面上的主題或服務" },
  { id: "carousel", label: "輪播圖文案", hint: "這組輪播想傳達的主題（AI 會拆成 5 張）" },
  { id: "story", label: "限動模板文案", hint: "這則限動想呈現的內容" },
];

const BOARD_STATUSES = ["草稿", "待審核", "已排程", "已發布"];
const DAILY_TASKS = ["發布一則內容", "回覆私訊詢問", "更新一則限動", "確認明日排程"];
const FUNNEL_STEPS = ["社群內容", "私訊", "預約", "到店", "成交", "回購"];
const GROWTH_LEVELS = [
  { id: 1, label: "Lv1　穩定發布", criterion: "近一個月每週都有穩定發布內容" },
  { id: 2, label: "Lv2　內容有明確定位", criterion: "已在 AI 社群助理設定目標客群與個人語氣" },
  { id: 3, label: "Lv3　具備穩定觀看", criterion: "內容平均觀看數已達自訂目標" },
  { id: 4, label: "Lv4　能帶來指定客", criterion: "近期有客人指定預約" },
  { id: 5, label: "Lv5　建立個人品牌", criterion: "有穩定的個人風格與粉絲基礎" },
  { id: 6, label: "Lv6　能帶領其他設計師", criterion: "有輔導其他設計師的實際經驗" },
];

function buildSystemPrompt(profile, type) {
  const filled = (v) => (v && v.trim() ? v.trim() : "未提供");
  return `你是 MULTIPLY 沙龍社群顧問，任務是為一位設計師產出「${type.label}」。

設計師個人資料：
- 擅長服務：${filled(profile.service)}
- 目標客群：${filled(profile.audience)}
- 個人語氣：${filled(profile.tone)}
- 客單價：${filled(profile.price)}
- 個人特色：${filled(profile.trait)}
- 不想使用的詞彙：${filled(profile.avoid)}

規則：
1. 全程使用繁體中文。
2. 語氣要貼合這位設計師的個人風格，不要寫成通用範本。
3. 絕對不要使用「不想使用的詞彙」中列出的字詞。
4. 內容最後要能自然引導對方私訊詢問或預約，但不要生硬推銷。
5. 只輸出最終內容本身，不要加上任何說明、標題或引號。`;
}

function buildProductionPrompt(profile, type) {
  const tone = profile.tone && profile.tone.trim() ? profile.tone.trim() : "親切自然";
  if (type.id === "cover") {
    return `你是 MULTIPLY 沙龍的社群美編顧問，要幫設計師寫「封面模板」上的文字。\n語氣風格：${tone}\n規則：\n1. 第一行輸出一句封面主標，繁體中文，不超過 12 個字，要吸睛。\n2. 第二行輸出一句輔助副標，不超過 18 個字。\n3. 不要加任何說明、引號或項目符號，只輸出這兩行。`;
  }
  if (type.id === "carousel") {
    return `你是 MULTIPLY 沙龍的社群美編顧問，要幫設計師拆解一組「輪播圖文案」，共 5 張。\n語氣風格：${tone}\n規則：\n1. 輸出剛好 5 行，每行代表一張輪播圖的文字重點（10-16 字內）。\n2. 第 1 張要能勾起興趣，第 5 張要引導私訊或預約。\n3. 不要加任何說明、編號或項目符號，只輸出 5 行文字本身。`;
  }
  return `你是 MULTIPLY 沙龍的社群美編顧問，要幫設計師寫「限動模板」上的文字。\n語氣風格：${tone}\n規則：\n1. 輸出 2-3 行，模擬限動連續幾則的文字重點，逐行呈現。\n2. 語氣輕鬆即時，像在跟熟客聊天。\n3. 不要加任何說明或項目符號，只輸出文字本身。`;
}

function buildDiagnosisPrompt(profile, currentLevel, nextLevel) {
  const filled = (v) => (v && v.trim() ? v.trim() : "未提供");
  return `你是 MULTIPLY 沙龍的社群教育長，要為一位設計師做「每月社群診斷」。

設計師資料：
- 擅長服務：${filled(profile.service)}
- 目標客群：${filled(profile.audience)}
- 個人語氣：${filled(profile.tone)}
- 目前分級：Lv${currentLevel}
- 下一級目標：${nextLevel ? nextLevel.label + "（" + nextLevel.criterion + "）" : "已達最高分級"}

規則：
1. 全程繁體中文，語氣像資深教育長給予具體回饋，不要空泛鼓勵。
2. 先用 2-3 句話診斷使用者提供的內容或數據摘要。
3. 接著條列 3 點具體可執行的下一步建議，幫助他往下一級邁進。
4. 不要加任何開場白或結語，直接輸出診斷與建議。`;
}

/* ---------- shared bits ---------- */

function Chip({ children, onRemove }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px 7px 14px", borderRadius: 999, border: `1px solid ${TOKENS.line}`, background: TOKENS.bgCard, color: TOKENS.ink, fontSize: 13, letterSpacing: "0.02em", margin: "0 8px 8px 0" }}>
      {children}
      {onRemove && <button onClick={onRemove} style={{ background: "none", border: "none", color: TOKENS.inkFaint, cursor: "pointer", padding: 2, display: "flex" }}><X size={12} /></button>}
    </span>
  );
}
function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 22, height: 1, background: TOKENS.goldDim }} />
      <span style={{ fontSize: 11.5, letterSpacing: "0.14em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}
function InfoNote({ children }) {
  return <div style={{ background: TOKENS.bgCard, border: `1px dashed ${TOKENS.line}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: TOKENS.inkFaint, lineHeight: 1.7, marginTop: 10 }}>{children}</div>;
}
const iconBtnStyle = { width: 28, height: 28, borderRadius: 8, border: `1px solid ${TOKENS.line}`, background: TOKENS.bgCard, color: TOKENS.inkDim, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const cardStyle = { background: TOKENS.bgCard, border: `1px solid ${TOKENS.line}`, borderRadius: 14, padding: 18 };
const inputStyle = { width: "100%", background: TOKENS.bgElev, border: `1px solid ${TOKENS.line}`, borderRadius: 8, padding: "8px 12px", color: TOKENS.ink, fontSize: 13, outline: "none" };
const primaryBtnStyle = (loading) => ({ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: loading ? TOKENS.goldDim : TOKENS.gold, color: TOKENS.bg, fontSize: 13.5, fontWeight: 600, cursor: loading ? "default" : "pointer" });

/* ---------- wheel / nav ---------- */

function Wheel({ active, onSelect }) {
  const R = 38;
  const nodes = LAYERS.map((layer, i) => {
    const angle = (-90 + i * 60) * (Math.PI / 180);
    return { ...layer, x: 50 + R * Math.cos(angle), y: 50 + R * Math.sin(angle), i };
  });
  return (
    <div style={{ position: "relative", width: "min(78vw, 460px)", aspectRatio: "1 / 1", margin: "0 auto" }}>
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <circle className="multiply-ring" cx="50" cy="50" r={R} fill="none" stroke={TOKENS.goldDim} strokeWidth="0.4" strokeDasharray="1 4" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={TOKENS.line} strokeWidth="0.3" />
        {nodes.map((node, i) => { const next = nodes[(i + 1) % nodes.length]; return <line key={node.key} x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke={TOKENS.line} strokeWidth="0.3" />; })}
      </svg>
      <button onClick={() => onSelect(0)} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "34%", aspectRatio: "1 / 1", borderRadius: "50%", background: active === 0 ? TOKENS.gold : TOKENS.bgElev, border: `1px solid ${active === 0 ? TOKENS.gold : TOKENS.line}`, color: active === 0 ? TOKENS.bg : TOKENS.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", textAlign: "center", fontFamily: "'Noto Serif TC', serif", transition: "all 0.2s ease" }}>
        <span style={{ fontSize: "clamp(11px,2.4vw,15px)", fontWeight: 700, letterSpacing: "0.05em" }}>MULTIPLY</span>
        <span style={{ fontSize: "clamp(8px,1.6vw,10px)", opacity: 0.75, marginTop: 2 }}>Creator OS</span>
      </button>
      {nodes.map((node) => {
        const Icon = node.icon; const isActive = active === node.i + 1;
        return (
          <button key={node.key} onClick={() => onSelect(node.i + 1)} title={node.name} style={{ position: "absolute", left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)", width: "22%", aspectRatio: "1 / 1", borderRadius: "50%", background: isActive ? TOKENS.gold : TOKENS.bgCard, border: `1px solid ${isActive ? TOKENS.gold : TOKENS.line}`, color: isActive ? TOKENS.bg : TOKENS.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s ease", boxShadow: isActive ? "0 0 0 4px rgba(201,160,99,0.15)" : "none" }}>
            <Icon size={18} strokeWidth={1.6} />
            <span style={{ fontSize: "clamp(7px,1.4vw,9.5px)", marginTop: 3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>{node.n}</span>
            {node.live && <span style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: isActive ? TOKENS.bg : "#7C9070", border: `1px solid ${TOKENS.bg}` }} />}
          </button>
        );
      })}
    </div>
  );
}
function PillNav({ active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 2px 14px" }}>
      <button onClick={() => onSelect(0)} style={pillStyle(active === 0)}>總覽</button>
      {LAYERS.map((l, i) => <button key={l.key} onClick={() => onSelect(i + 1)} style={{ ...pillStyle(active === i + 1), fontFamily: "'JetBrains Mono', monospace" }}>{l.n} {l.name}{l.live ? " ●" : ""}</button>)}
    </div>
  );
}
const pillStyle = (isActive) => ({ flexShrink: 0, padding: "8px 16px", borderRadius: 999, border: `1px solid ${isActive ? TOKENS.gold : TOKENS.line}`, background: isActive ? TOKENS.gold : "transparent", color: isActive ? TOKENS.bg : TOKENS.inkDim, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" });

/* ---------- overview ---------- */

function Overview({ onSelect }) {
  return (
    <div>
      <Wheel active={0} onSelect={onSelect} />
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, margin: "22px 0 8px", color: TOKENS.inkFaint, fontSize: 12.5 }}>
        {CYCLE.map((c, i) => <React.Fragment key={c}><span>{c}</span>{i < CYCLE.length - 1 && <ArrowRight size={13} style={{ margin: "0 2px", opacity: 0.5 }} />}</React.Fragment>)}
        <ArrowRight size={13} style={{ margin: "0 2px", opacity: 0.5 }} /><span style={{ color: TOKENS.gold }}>再進入下一輪</span>
      </div>
      <p style={{ textAlign: "center", color: TOKENS.inkDim, fontSize: 13.5, maxWidth: 520, margin: "18px auto 0", lineHeight: 1.8 }}>
        真正的核心是：讓設計師持續產出能帶來指定與成交的內容。<br />
        六層節點皆已標示 <span style={{ color: TOKENS.gold }}>綠點</span>，代表可實際操作與儲存資料。
      </p>
      <div style={{ marginTop: 48 }}>
        <SectionLabel>平台底層基礎模組</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 16 }}>
          {BASE_MODULES.map((m) => { const Icon = m.icon; return (
            <div key={m.name} style={{ background: TOKENS.bgCard, border: `1px solid ${TOKENS.line}`, borderRadius: 14, padding: "20px 20px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><Icon size={18} color={TOKENS.gold} strokeWidth={1.6} /><h4 style={{ margin: 0, fontFamily: "'Noto Serif TC', serif", fontWeight: 600, fontSize: 15.5, color: TOKENS.ink }}>{m.name}</h4></div>
              <div style={{ display: "flex", flexWrap: "wrap" }}>{m.items.map((it) => <span key={it} style={{ fontSize: 12, color: TOKENS.inkDim, border: `1px solid ${TOKENS.line}`, borderRadius: 6, padding: "3px 8px", margin: "0 6px 6px 0" }}>{it}</span>)}</div>
              <p style={{ fontSize: 12, color: TOKENS.inkFaint, marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>{m.note}</p>
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}

/* ---------- shared: designer profile hook ---------- */

function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: TOKENS.inkFaint, marginBottom: 5 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}
function useDesignerProfile() {
  const userId = useUserId();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const row = await getProfile(userId);
        if (row) setProfile({ service: row.service || "", audience: row.audience || "", tone: row.tone || "", price: row.price || "", trait: row.trait || "", avoid: row.avoid || "" });
      } catch (e) {}
      finally { setLoaded(true); }
    })();
  }, [userId]);
  return [profile, loaded];
}

/* ---------- Layer 02: AI Content Assistant ---------- */

function AIAssistant() {
  const userId = useUserId();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const saveTimeout = useRef(null);
  const [typeId, setTypeId] = useState("ig");
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const type = CONTENT_TYPES.find((t) => t.id === typeId);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const row = await getProfile(userId);
        if (row) setProfile({ service: row.service || "", audience: row.audience || "", tone: row.tone || "", price: row.price || "", trait: row.trait || "", avoid: row.avoid || "" });
      } catch (e) {}
      finally { setProfileLoaded(true); }
    })();
  }, [userId]);

  const persist = async (next) => {
    setSaveState("saving");
    try { await upsertProfile(userId, next); setSaveState("saved"); }
    catch (e) { setSaveState("idle"); }
  };
  const setProfileField = (key, value) => {
    setProfile((prev) => { const next = { ...prev, [key]: value }; if (saveTimeout.current) clearTimeout(saveTimeout.current); saveTimeout.current = setTimeout(() => persist(next), 700); return next; });
  };
  const generate = async () => {
    if (!type.optional && !topic.trim()) { setError("請先填寫內容需求，AI 才知道要寫什麼。"); return; }
    setError(""); setLoading(true); setOutput("");
    try {
      const userMessage = type.needsSource ? `原始文案：\n${topic}` : topic.trim() ? `主題／需求：${topic}` : `請依照我的個人資料，發想一則適合的社群主題與內容方向。`;
      const text = await callClaude(buildSystemPrompt(profile, type), userMessage, 1000);
      setOutput(text);
    } catch (e) { setError(e.message || "生成失敗，請再試一次。"); } finally { setLoading(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,320px) 1fr", gap: 18 }}>
        <div>
          <div style={{ ...cardStyle, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>設計師個人資料</span>
              <span style={{ fontSize: 10.5, color: saveState === "saving" ? TOKENS.gold : TOKENS.inkFaint }}>{saveState === "saving" ? "儲存中…" : saveState === "saved" ? "已自動儲存" : profileLoaded ? "" : "載入中…"}</span>
            </div>
            {PROFILE_FIELDS.map((f) => <Field key={f.key} label={f.label} value={profile[f.key]} onChange={(v) => setProfileField(f.key, v)} placeholder={f.placeholder} />)}
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>內容類型</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {CONTENT_TYPES.map((t) => <button key={t.id} onClick={() => setTypeId(t.id)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12.5, border: `1px solid ${typeId === t.id ? TOKENS.gold : TOKENS.line}`, background: typeId === t.id ? TOKENS.gold : "transparent", color: typeId === t.id ? TOKENS.bg : TOKENS.inkDim, cursor: "pointer" }}>{t.label}</button>)}
            </div>
            <label style={{ display: "block", fontSize: 12, color: TOKENS.inkFaint, marginBottom: 6 }}>{type.placeholder}</label>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} placeholder={type.needsSource ? "貼上原始文案內容…" : "輸入需求…"} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            {error && <p style={{ color: "#C77A6B", fontSize: 12.5, margin: "10px 0 0" }}>{error}</p>}
            <button onClick={generate} disabled={loading} style={{ ...primaryBtnStyle(loading), width: "100%", marginTop: 14, fontSize: 14 }}>{loading ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}{loading ? "生成中…" : "產出內容"}</button>
          </div>
        </div>
        <div style={{ ...cardStyle, minHeight: 380, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>產出結果 — {type.label}</span>
            {output && !loading && <div style={{ display: "flex", gap: 8 }}><button onClick={generate} title="重新產出" style={iconBtnStyle}><RefreshCw size={14} /></button><button onClick={copy} title="複製" style={iconBtnStyle}>{copied ? <Check size={14} color={TOKENS.gold} /> : <Copy size={14} />}</button></div>}
          </div>
          {loading ? <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>{[100, 88, 92, 60].map((w, i) => <div key={i} className="pulse-bar" style={{ height: 12, width: `${w}%`, borderRadius: 6, background: TOKENS.bgElev }} />)}</div>
            : output ? <p style={{ whiteSpace: "pre-wrap", fontSize: 14.5, lineHeight: 1.9, color: TOKENS.ink, margin: 0 }}>{output}</p>
            : <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: TOKENS.inkFaint, textAlign: "center" }}><MessageSquareText size={26} strokeWidth={1.3} style={{ marginBottom: 10, opacity: 0.6 }} /><p style={{ fontSize: 13, margin: 0, maxWidth: 240, lineHeight: 1.8 }}>填寫左側個人資料與需求，按下「產出內容」查看結果。</p></div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Layer 01: Content Strategy ---------- */

function TagEditor({ label, listKey, hint }) {
  const userId = useUserId();
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const load = async () => { try { setItems(await getTagList(listKey)); } catch (e) {} };
  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [listKey]);
  const add = async () => { const v = input.trim(); if (!v) return; setInput(""); try { await addTagItem(userId, listKey, v); await load(); } catch (e) {} };
  const remove = async (id) => { try { await removeTagItem(id); await load(); } catch (e) {} };
  return (
    <div style={{ ...cardStyle, marginBottom: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>{label}</div>
      <div style={{ marginBottom: 10 }}>{loaded && items.length === 0 && <span style={{ fontSize: 12.5, color: TOKENS.inkFaint }}>尚未新增項目</span>}{items.map((it) => <Chip key={it.id} onRemove={() => remove(it.id)}>{it.label}</Chip>)}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder={hint} style={{ flex: 1, ...inputStyle }} />
        <button onClick={add} style={{ ...iconBtnStyle, width: 36, height: 36 }}><Plus size={16} /></button>
      </div>
    </div>
  );
}
function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function ContentCalendar() {
  const userId = useUserId();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth());
  const [calendar, setCalendar] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [draft, setDraft] = useState("");
  useEffect(() => { (async () => { try { setCalendar(await getCalendarMonth(year, month + 1)); } catch (e) {} })(); }, [year, month]);
  const openDay = (d) => { setSelectedDay(d); setDraft(calendar[d] || ""); };
  const saveDay = async () => {
    try {
      await saveCalendarDay(userId, year, month + 1, selectedDay, draft);
      const next = { ...calendar };
      if (draft.trim()) next[selectedDay] = draft.trim(); else delete next[selectedDay];
      setCalendar(next);
    } catch (e) {}
    setSelectedDay(null);
  };
  const total = daysInMonth(year, month);
  const firstWeekday = new Date(year, month, 1).getDay();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><CalendarDays size={14} color={TOKENS.gold} /><span style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>{year} 年 {month + 1} 月內容行事曆</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 4 }}>{["日", "一", "二", "三", "四", "五", "六"].map((d) => <div key={d} style={{ textAlign: "center", fontSize: 11, color: TOKENS.inkFaint }}>{d}</div>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {cells.map((d, i) => d === null ? <div key={i} /> : (
          <button key={i} onClick={() => openDay(d)} style={{ aspectRatio: "1/1", borderRadius: 8, border: `1px solid ${selectedDay === d ? TOKENS.gold : TOKENS.line}`, background: calendar[d] ? "rgba(201,160,99,0.14)" : TOKENS.bgElev, color: TOKENS.ink, fontSize: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 2 }}>
            <span>{d}</span>{calendar[d] && <span style={{ width: 4, height: 4, borderRadius: "50%", background: TOKENS.gold, marginTop: 2 }} />}
          </button>
        ))}
      </div>
      {selectedDay && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${TOKENS.line}`, paddingTop: 14 }}>
          <div style={{ fontSize: 12, color: TOKENS.inkFaint, marginBottom: 8 }}>{month + 1} 月 {selectedDay} 日的內容主題</div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="輸入或貼上這天要發的主題…" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={saveDay} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: TOKENS.gold, color: TOKENS.bg, fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}>儲存</button>
            <button onClick={() => setSelectedDay(null)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${TOKENS.line}`, background: "transparent", color: TOKENS.inkDim, fontSize: 12.5, cursor: "pointer" }}>取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
function DailyTopicGenerator() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [error, setError] = useState("");
  const generate = async () => {
    setLoading(true); setError(""); setIdeas([]);
    try {
      let dbContext = "";
      try {
        const [cats, pains, topics] = await Promise.all([
          getTagList("content-categories").catch(() => []),
          getTagList("pain-points").catch(() => []),
          getTagList("service-topics").catch(() => []),
        ]);
        const j = (list) => list.map((it) => it.label).join("、");
        dbContext = `內容分類：${j(cats) || "未提供"}\n客群痛點：${j(pains) || "未提供"}\n服務主題：${j(topics) || "未提供"}`;
      } catch (e) {}
      const response = await callClaude(`你是 MULTIPLY 沙龍的社群內容策略顧問，要幫設計師發想「每日內容題目」。\n品牌資料庫參考：\n${dbContext}\n規則：\n1. 全程繁體中文。\n2. 輸出剛好 5 個題目，每行一個，格式為「題目 — 一句話說明為什麼值得看」。\n3. 不要加編號或項目符號。`, input.trim() ? `這次想聚焦：${input.trim()}` : "請自由發想本週題目", 600);
      const lines = response.split("\n").map((l) => l.replace(/^[\-•\d\.\s]+/, "").trim()).filter(Boolean);
      if (!lines.length) throw new Error("AI 回傳了空白內容，請再試一次。");
      setIdeas(lines);
    } catch (e) { setError(e.message || "生成失敗，請再試一次。"); } finally { setLoading(false); }
  };
  return (
    <div style={{ ...cardStyle, marginBottom: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>AI 每日內容題目</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="想聚焦的方向（可留空）" style={{ flex: 1, ...inputStyle }} />
        <button onClick={generate} disabled={loading} style={primaryBtnStyle(loading)}>{loading ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />} 產生</button>
      </div>
      {error && <p style={{ color: "#C77A6B", fontSize: 12.5, margin: "0 0 8px" }}>{error}</p>}
      {ideas.map((idea, i) => <div key={i} style={{ padding: "8px 10px", background: TOKENS.bgElev, borderRadius: 8, marginBottom: 6, fontSize: 12.5, color: TOKENS.ink, lineHeight: 1.6 }}>{idea}</div>)}
    </div>
  );
}
function ContentStrategyPanel() {
  return (
    <div style={{ marginTop: 8 }}>
      <InfoNote>以下「每日題目」「行事曆」「三個資料庫」已可實際使用並自動儲存；資料庫屬於團隊共用，所有使用者都看得到。「爆款案例拆解」「品牌內容方向」「個人定位設定」「成功內容模板」仍為架構規劃，尚未做成功能。</InfoNote>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(260px,1fr) minmax(260px,1fr)", gap: 18 }}>
        <div><DailyTopicGenerator /><TagEditor label="內容分類" listKey="content-categories" hint="新增分類，按 Enter" /></div>
        <div><ContentCalendar /></div>
      </div>
      <div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "minmax(260px,1fr) minmax(260px,1fr)", gap: 18 }}>
        <TagEditor label="客群痛點資料庫" listKey="pain-points" hint="新增痛點，按 Enter" />
        <TagEditor label="服務主題資料庫" listKey="service-topics" hint="新增服務主題，按 Enter" />
      </div>
    </div>
  );
}

/* ---------- Layer 03: Content Production ---------- */

function ProductionPanel() {
  const [profile] = useDesignerProfile();
  const [typeId, setTypeId] = useState("cover");
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const type = PRODUCTION_TYPES.find((t) => t.id === typeId);
  const generate = async () => {
    if (!topic.trim()) { setError("請先填寫這篇內容的主題。"); return; }
    setError(""); setLoading(true); setOutput("");
    try {
      const text = await callClaude(buildProductionPrompt(profile, type), `主題：${topic}`, 500);
      setOutput(text);
    } catch (e) { setError(e.message || "生成失敗，請再試一次。"); } finally { setLoading(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };
  const lines = output.split("\n").filter(Boolean);
  return (
    <div style={{ marginTop: 8 }}>
      <InfoNote>影片自動化功能（自動剪停頓、自動字幕、9:16 裁切、人臉追蹤等）需要真正的影片處理引擎，此原型尚未串接，僅呈現架構。以下「封面／輪播圖／限動」文案產生器已可實際使用，並會沿用你在 AI 社群助理設定的語氣。</InfoNote>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(240px,320px) 1fr", gap: 18 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>模板類型</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>{PRODUCTION_TYPES.map((t) => <button key={t.id} onClick={() => setTypeId(t.id)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12.5, border: `1px solid ${typeId === t.id ? TOKENS.gold : TOKENS.line}`, background: typeId === t.id ? TOKENS.gold : "transparent", color: typeId === t.id ? TOKENS.bg : TOKENS.inkDim, cursor: "pointer" }}>{t.label}</button>)}</div>
          <label style={{ display: "block", fontSize: 12, color: TOKENS.inkFaint, marginBottom: 6 }}>{type.hint}</label>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="輸入主題…" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          {error && <p style={{ color: "#C77A6B", fontSize: 12.5, margin: "10px 0 0" }}>{error}</p>}
          <button onClick={generate} disabled={loading} style={{ ...primaryBtnStyle(loading), width: "100%", marginTop: 14, fontSize: 14 }}>{loading ? <Loader2 size={16} className="spin" /> : <ImageIcon size={16} />}{loading ? "生成中…" : "產出文案"}</button>
        </div>
        <div style={{ ...cardStyle, minHeight: 320, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>產出結果 — {type.label}</span>
            {output && !loading && <div style={{ display: "flex", gap: 8 }}><button onClick={generate} title="重新產出" style={iconBtnStyle}><RefreshCw size={14} /></button><button onClick={copy} title="複製" style={iconBtnStyle}>{copied ? <Check size={14} color={TOKENS.gold} /> : <Copy size={14} />}</button></div>}
          </div>
          {loading ? <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>{[100, 70].map((w, i) => <div key={i} className="pulse-bar" style={{ height: 14, width: `${w}%`, borderRadius: 6, background: TOKENS.bgElev }} />)}</div>
            : output ? (typeId === "cover" ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "100%", maxWidth: 220, aspectRatio: "4/5", borderRadius: 14, background: `linear-gradient(160deg, ${TOKENS.goldDim}, ${TOKENS.bgElev})`, border: `1px solid ${TOKENS.gold}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 20 }}>
                  <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: TOKENS.ink, lineHeight: 1.4 }}>{lines[0]}</span>
                  {lines[1] && <span style={{ fontSize: 13, color: TOKENS.inkDim, marginTop: 10 }}>{lines[1]}</span>}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: TOKENS.bgElev, borderRadius: 8, padding: "8px 12px" }}><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TOKENS.gold }}>{String(i + 1).padStart(2, "0")}</span><span style={{ fontSize: 13.5, color: TOKENS.ink }}>{l}</span></div>)}</div>
            )) : <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: TOKENS.inkFaint, textAlign: "center" }}><ImageIcon size={26} strokeWidth={1.3} style={{ marginBottom: 10, opacity: 0.6 }} /><p style={{ fontSize: 13, margin: 0, maxWidth: 240, lineHeight: 1.8 }}>選擇模板類型並輸入主題，按下「產出文案」查看結果。</p></div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Layer 04: Publishing & Execution ---------- */

function PublishingPanel() {
  const userId = useUserId();
  const todayKey = new Date().toISOString().slice(0, 10);
  const [nickname, setNickname] = useState("");
  const nicknameTimeout = useRef(null);
  const [board, setBoard] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [tasksDone, setTasksDone] = useState({});
  const [reportedToday, setReportedToday] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const loadBoard = async () => { try { setBoard(await getBoard()); } catch (e) {} };
  const loadLeaderboard = async () => { try { setLeaderboard(await getLeaderboard()); } catch (e) {} };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try { const row = await getProfile(userId); if (row) setNickname(row.nickname || ""); } catch (e) {}
      try { setTasksDone(await getDailyTasks(userId, todayKey)); } catch (e) {}
      try { setReportedToday(await hasReportedToday(userId, todayKey)); } catch (e) {}
      await loadBoard();
      await loadLeaderboard();
    })();
  }, [userId]);

  const saveNickname = (v) => {
    setNickname(v);
    if (nicknameTimeout.current) clearTimeout(nicknameTimeout.current);
    nicknameTimeout.current = setTimeout(() => { upsertProfile(userId, { nickname: v }).catch(() => {}); }, 700);
  };
  const addItem = async () => {
    if (!newTitle.trim()) return;
    const title = newTitle.trim();
    setNewTitle("");
    try { await addBoardItem(userId, title, nickname || "未命名"); await loadBoard(); } catch (e) {}
  };
  const moveItem = async (id, dir) => {
    const item = board.find((it) => it.id === id);
    if (!item) return;
    const idx = BOARD_STATUSES.indexOf(item.status);
    const ni = Math.min(BOARD_STATUSES.length - 1, Math.max(0, idx + dir));
    try { await moveBoardItem(id, BOARD_STATUSES[ni]); await loadBoard(); } catch (e) {}
  };
  const removeItem = async (id) => { try { await removeBoardItem(id); await loadBoard(); } catch (e) {} };
  const toggleTask = (i) => {
    const next = { ...tasksDone, [i]: !tasksDone[i] };
    setTasksDone(next);
    saveDailyTasks(userId, todayKey, next).catch(() => {});
  };
  const doneCount = DAILY_TASKS.filter((_, i) => tasksDone[i]).length;
  const allDone = doneCount === DAILY_TASKS.length;

  const doReportExecution = async () => {
    if (!nickname.trim()) return;
    try {
      await reportExecutionApi(userId, nickname, todayKey);
      await loadLeaderboard();
      setReportedToday(true);
    } catch (e) {}
  };

  const sortedLeaders = leaderboard;

  return (
    <div style={{ marginTop: 8 }}>
      <InfoNote>草稿看板與排行榜屬於團隊共用資料，所有使用者都看得到。個人資料與每日任務打勾狀態僅你自己看得到。</InfoNote>

      <div style={{ ...cardStyle, marginTop: 16, marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, color: TOKENS.inkFaint, marginBottom: 6 }}>你的暱稱（用於排行榜與看板署名）</label>
        <input value={nickname} onChange={(e) => saveNickname(e.target.value)} placeholder="例如：小豪" style={{ ...inputStyle, maxWidth: 260 }} />
      </div>

      <SectionLabel>草稿與發布看板</SectionLabel>
      <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addItem(); }} placeholder="新增一則內容草稿…" style={{ flex: 1, ...inputStyle }} />
        <button onClick={addItem} style={{ ...iconBtnStyle, width: 36, height: 36 }}><Plus size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12, marginBottom: 32 }}>
        {BOARD_STATUSES.map((status, colIdx) => (
          <div key={status} style={cardStyle}>
            <div style={{ fontSize: 11.5, letterSpacing: "0.08em", color: TOKENS.gold, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>{status}</div>
            {board.filter((it) => it.status === status).length === 0 && <span style={{ fontSize: 12, color: TOKENS.inkFaint }}>—</span>}
            {board.filter((it) => it.status === status).map((it) => (
              <div key={it.id} style={{ background: TOKENS.bgElev, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                <div style={{ fontSize: 12.5, color: TOKENS.ink, marginBottom: 6, lineHeight: 1.5 }}>{it.title}</div>
                <div style={{ fontSize: 10.5, color: TOKENS.inkFaint, marginBottom: 6 }}>{it.owner_nickname}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {colIdx > 0 && <button onClick={() => moveItem(it.id, -1)} title="上一階段" style={{ ...iconBtnStyle, width: 22, height: 22 }}><ChevronLeft size={12} /></button>}
                  {colIdx < BOARD_STATUSES.length - 1 && <button onClick={() => moveItem(it.id, 1)} title="下一階段" style={{ ...iconBtnStyle, width: 22, height: 22 }}><ChevronRightIcon size={12} /></button>}
                  <button onClick={() => removeItem(it.id)} title="刪除" style={{ ...iconBtnStyle, width: 22, height: 22 }}><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) minmax(260px,1fr)", gap: 18 }}>
        <div>
          <SectionLabel>每日任務</SectionLabel>
          <div style={{ ...cardStyle, marginTop: 14 }}>
            {DAILY_TASKS.map((t, i) => (
              <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 13, color: TOKENS.ink, cursor: "pointer" }}>
                <input type="checkbox" checked={!!tasksDone[i]} onChange={() => toggleTask(i)} style={{ accentColor: TOKENS.gold, width: 15, height: 15 }} />
                {t}
              </label>
            ))}
            <div style={{ height: 6, background: TOKENS.bgElev, borderRadius: 4, overflow: "hidden", margin: "10px 0" }}>
              <div style={{ width: `${(doneCount / DAILY_TASKS.length) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${TOKENS.goldDim}, ${TOKENS.gold})` }} />
            </div>
            <button onClick={doReportExecution} disabled={!allDone || reportedToday || !nickname.trim()} style={{ ...primaryBtnStyle(false), width: "100%", opacity: !allDone || reportedToday || !nickname.trim() ? 0.5 : 1, cursor: !allDone || reportedToday || !nickname.trim() ? "default" : "pointer" }}>
              {reportedToday ? "今日已回報" : "回報今日執行"}
            </button>
            {!nickname.trim() && <p style={{ fontSize: 11, color: TOKENS.inkFaint, marginTop: 8 }}>請先填寫上方暱稱才能回報。</p>}
          </div>
        </div>
        <div>
          <SectionLabel>團隊執行排行榜</SectionLabel>
          <div style={{ ...cardStyle, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Trophy size={14} color={TOKENS.gold} /><span style={{ fontSize: 11, color: TOKENS.inkFaint }}>依累積回報天數排序</span></div>
            {sortedLeaders.length === 0 && <span style={{ fontSize: 12.5, color: TOKENS.inkFaint }}>尚無回報紀錄</span>}
            {sortedLeaders.map((entry, i) => (
              <div key={entry.nickname + i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < sortedLeaders.length - 1 ? `1px solid ${TOKENS.line}` : "none" }}>
                <span style={{ fontSize: 13, color: TOKENS.ink }}><span style={{ color: TOKENS.gold, fontFamily: "'JetBrains Mono', monospace", marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>{entry.nickname}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: TOKENS.inkDim }}>{entry.count} 天</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Layer 05: Performance & Conversion Analytics ---------- */

function AnalyticsPanel() {
  const userId = useUserId();
  const [values, setValues] = useState({});
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!userId) return;
    (async () => { try { setHistory(await getAnalyticsHistory(userId)); } catch (e) {} })();
  }, [userId]);
  const setVal = (step, v) => setValues((prev) => ({ ...prev, [step]: v }));
  const saveWeek = async () => {
    const weekLabel = new Date().toISOString().slice(0, 10);
    try {
      await saveAnalyticsWeek(userId, weekLabel, values);
      setHistory(await getAnalyticsHistory(userId));
      setSaved(true); setTimeout(() => setSaved(false), 1500);
    } catch (e) {}
  };
  const nums = FUNNEL_STEPS.map((s) => Number(values[s]) || 0);
  const base = nums[0] || 0;

  return (
    <div style={{ marginTop: 8 }}>
      <InfoNote>此為手動輸入的儀表板，尚未串接 Instagram、預約系統等真實數據源——之後可透過「資料整合」模組把這裡改成自動抓取。這裡的數字只有你自己看得到。</InfoNote>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(260px,1fr) minmax(260px,1fr)", gap: 18 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 14 }}>本週數據輸入</div>
          {FUNNEL_STEPS.map((step) => (
            <div key={step} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: TOKENS.inkDim }}>{step}</label>
              <input type="number" min="0" value={values[step] || ""} onChange={(e) => setVal(step, e.target.value)} placeholder="0" style={{ width: 90, ...inputStyle, textAlign: "right" }} />
            </div>
          ))}
          <button onClick={saveWeek} style={{ ...primaryBtnStyle(false), width: "100%", marginTop: 10 }}>{saved ? <Check size={16} /> : null}{saved ? "已儲存" : "儲存本週數據"}</button>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 14 }}>轉換漏斗</div>
          {FUNNEL_STEPS.map((step, i) => {
            const pct = base > 0 ? Math.round((nums[i] / base) * 100) : 0;
            return (
              <div key={step} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: TOKENS.inkDim, marginBottom: 4 }}><span>{step}</span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{nums[i]}（{pct}%）</span></div>
                <div style={{ height: 8, background: TOKENS.bgElev, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${TOKENS.goldDim}, ${TOKENS.gold})`, borderRadius: 4 }} /></div>
              </div>
            );
          })}
        </div>
      </div>
      {history.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionLabel>歷史紀錄</SectionLabel>
          <div style={{ ...cardStyle, marginTop: 14 }}>
            {history.slice().reverse().map((h) => {
              const first = Number(h.values[FUNNEL_STEPS[0]]) || 0;
              const last = Number(h.values[FUNNEL_STEPS[FUNNEL_STEPS.length - 1]]) || 0;
              const rate = first > 0 ? Math.round((last / first) * 100) : 0;
              return (
                <div key={h.week} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: TOKENS.inkDim, padding: "6px 0", borderBottom: `1px solid ${TOKENS.line}` }}>
                  <span>{h.week}</span><span>社群內容 {first} → 回購 {last}（整體轉換 {rate}%）</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Layer 06: Creator Growth System ---------- */

function GrowthPanel() {
  const userId = useUserId();
  const [profile] = useDesignerProfile();
  const [checks, setChecks] = useState({});
  useEffect(() => {
    if (!userId) return;
    (async () => { try { setChecks(await getGrowthChecklist(userId)); } catch (e) {} })();
  }, [userId]);
  const toggle = (id) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    saveGrowthChecklist(userId, next).catch(() => {});
  };

  const profileFilled = !!(profile.audience && profile.tone);
  let currentLevel = 0;
  for (const lv of GROWTH_LEVELS) {
    const achieved = lv.id === 2 ? (checks[2] || profileFilled) : checks[lv.id];
    if (achieved) currentLevel = lv.id; else break;
  }
  const nextLevel = GROWTH_LEVELS.find((l) => l.id === currentLevel + 1);

  const [diagInput, setDiagInput] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generateDiagnosis = async () => {
    if (!diagInput.trim()) { setError("請先貼上近期的內容或數據摘要。"); return; }
    setError(""); setLoading(true); setDiagnosis("");
    try {
      const text = await callClaude(buildDiagnosisPrompt(profile, currentLevel, nextLevel), diagInput, 700);
      setDiagnosis(text);
    } catch (e) { setError(e.message || "生成失敗，請再試一次。"); } finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <InfoNote>分級由下方自我評估勾選決定（Lv2 會自動偵測你在 AI 社群助理是否已填寫個人資料）。診斷結果不存資料，僅供當次參考。</InfoNote>

      <div style={{ marginTop: 16, position: "relative", paddingLeft: 22 }}>
        <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 1, background: TOKENS.line }} />
        {GROWTH_LEVELS.map((lv) => {
          const isCurrent = lv.id === currentLevel;
          const achieved = lv.id === 2 ? (checks[2] || profileFilled) : checks[lv.id];
          return (
            <div key={lv.id} style={{ position: "relative", marginBottom: 16 }}>
              <div style={{ position: "absolute", left: -22 + 1, top: 3, width: 10, height: 10, borderRadius: "50%", background: isCurrent ? TOKENS.gold : TOKENS.bg, border: `1px solid ${TOKENS.gold}` }} />
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: lv.id === 2 ? "default" : "pointer" }}>
                {lv.id !== 2 && <input type="checkbox" checked={!!checks[lv.id]} onChange={() => toggle(lv.id)} style={{ accentColor: TOKENS.gold, width: 15, height: 15 }} />}
                {lv.id === 2 && <input type="checkbox" checked={achieved} disabled style={{ accentColor: TOKENS.gold, width: 15, height: 15, opacity: 0.6 }} />}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, color: isCurrent ? TOKENS.gold : TOKENS.ink }}>{lv.label}</span>
                {isCurrent && <span style={{ fontSize: 11, color: TOKENS.inkFaint, border: `1px solid ${TOKENS.line}`, borderRadius: 6, padding: "1px 7px" }}>目前等級</span>}
              </label>
              <p style={{ margin: "4px 0 0 25px", fontSize: 12, color: TOKENS.inkFaint }}>{lv.criterion}</p>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionLabel>AI 每月社群診斷</SectionLabel>
        <div style={{ ...cardStyle, marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: TOKENS.inkFaint, marginBottom: 6 }}>貼上近期發布狀況、數據或遇到的困難</label>
          <textarea value={diagInput} onChange={(e) => setDiagInput(e.target.value)} rows={4} placeholder="例如：這個月發了 8 篇，平均觀看數比上月下降，私訊變少…" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          {error && <p style={{ color: "#C77A6B", fontSize: 12.5, margin: "10px 0 0" }}>{error}</p>}
          <button onClick={generateDiagnosis} disabled={loading} style={{ ...primaryBtnStyle(loading), marginTop: 12 }}>{loading ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}{loading ? "診斷中…" : "產生診斷"}</button>
          {loading && <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>{[100, 85, 92].map((w, i) => <div key={i} className="pulse-bar" style={{ height: 12, width: `${w}%`, borderRadius: 6, background: TOKENS.bgElev }} />)}</div>}
          {diagnosis && !loading && <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.9, color: TOKENS.ink, marginTop: 16 }}>{diagnosis}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- layer detail ---------- */

function LayerDetail({ layer, onBack }) {
  const Icon = layer.icon;
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: TOKENS.inkDim, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 28 }}><ChevronLeft size={15} /> 返回總覽</button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 6 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: TOKENS.bgCard, border: `1px solid ${TOKENS.goldDim}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={24} color={TOKENS.gold} strokeWidth={1.5} /></div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TOKENS.gold, letterSpacing: "0.1em", marginBottom: 4 }}>第 {layer.n} 層 ／ {layer.en}{layer.live && <span style={{ color: "#7C9070", marginLeft: 8 }}>● 可實際使用</span>}</div>
          <h2 style={{ margin: 0, fontFamily: "'Noto Serif TC', serif", fontSize: "clamp(22px,4vw,30px)", color: TOKENS.ink, fontWeight: 700 }}>{layer.name}</h2>
        </div>
      </div>
      <p style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 17, color: TOKENS.ink, fontStyle: "italic", margin: "20px 0 6px", paddingLeft: 20, borderLeft: `2px solid ${TOKENS.gold}` }}>「{layer.problem}」</p>
      <p style={{ color: TOKENS.inkDim, fontSize: 14, lineHeight: 1.9, maxWidth: 620, margin: "12px 0 32px" }}>{layer.core}</p>
      <SectionLabel>功能模組</SectionLabel>
      <div style={{ marginTop: 14 }}>{layer.features.map((f) => <Chip key={f}>{f}</Chip>)}</div>

      {layer.key === "strategy" && <ContentStrategyPanel />}
      {layer.key === "ai" && <AIAssistant />}
      {layer.key === "production" && <ProductionPanel />}
      {layer.key === "publishing" && <PublishingPanel />}
      {layer.key === "analytics" && <AnalyticsPanel />}
      {layer.key === "growth" && <GrowthPanel />}
    </div>
  );
}

/* ---------- app ---------- */

export default function MultiplyCreatorOS({ user }) {
  const [active, setActive] = useState(0);
  const router = useRouter();
  const signOut = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  return (
    <UserIdContext.Provider value={user?.id}>
      <div style={{ background: TOKENS.bg, minHeight: "100%", color: TOKENS.ink, fontFamily: "'Noto Sans TC', sans-serif", padding: "36px 20px 64px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 6, position: "relative" }}>
            <Sparkles size={14} color={TOKENS.gold} />
            <span style={{ fontSize: 11.5, letterSpacing: "0.14em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>ALL 6 LAYERS LIVE</span>
            <button onClick={signOut} title="登出" style={{ position: "absolute", right: 0, display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${TOKENS.line}`, borderRadius: 999, padding: "5px 12px", color: TOKENS.inkDim, fontSize: 11.5, cursor: "pointer" }}>
              <LogOut size={12} /> 登出
            </button>
          </div>
          <h1 style={{ textAlign: "center", fontFamily: "'Noto Serif TC', serif", fontSize: "clamp(26px,5vw,38px)", fontWeight: 700, margin: "0 0 10px" }}>MULTIPLY Creator OS</h1>
          <p style={{ textAlign: "center", color: TOKENS.inkDim, fontSize: 14.5, margin: "0 0 8px" }}>六層內容作業系統 — 從找到題目，到再進入下一輪</p>
          {user?.email && <p style={{ textAlign: "center", color: TOKENS.inkFaint, fontSize: 12, margin: "0 0 24px" }}>{user.email}</p>}
          <PillNav active={active} onSelect={setActive} />
          <div style={{ background: TOKENS.bgElev, border: `1px solid ${TOKENS.line}`, borderRadius: 20, padding: "clamp(24px,4vw,44px)" }}>
            {active === 0 ? <Overview onSelect={setActive} /> : <LayerDetail layer={LAYERS[active - 1]} onBack={() => setActive(0)} />}
          </div>
        </div>
      </div>
    </UserIdContext.Provider>
  );
}
