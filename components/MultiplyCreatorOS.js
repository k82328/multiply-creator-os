"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, ClipboardCheck,
  Users, BookOpen, Link2, ArrowRight, ChevronLeft, Sparkles,
  Wand2, Copy, Check, RefreshCw, Loader2, MessageSquareText,
  LogOut,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { callClaude } from "../lib/claude";
import { UserIdContext, useUserId } from "../lib/UserIdContext";
import {
  getProfile, upsertProfile,
  getSettings, updateSettings,
  getDailyReport, upsertDailyReport, getAllDailyReportsForDate,
  getWeeklyReport, upsertWeeklyReport, getAllWeeklyReportsForWeek,
  getAllDesignerProfiles,
} from "../lib/data";

const TOKENS = {
  bg: "#131209", bgElev: "#1C1A12", bgCard: "#211E15",
  ink: "#F1EADA", inkDim: "#A79A80", inkFaint: "#6E6552",
  line: "#39321F", gold: "#C9A063", goldDim: "#8A7047",
};

const LAYERS = [
  { n: "01", key: "content", name: "內容策略與 AI 助理", en: "Content Strategy & AI Assistant", icon: Bot,
    problem: "我今天要發什麼？寫出來又怕不像我。",
    core: "設定好你的個人資料，AI 就能先幫你想題目，再直接把選中的題目寫成貼文——從發想到成稿一次完成。",
    features: ["設計師個人資料", "AI 每日內容題目", "AI 三秒鉤子", "AI Reels 腳本", "AI IG 文案", "AI Threads 文案", "AI 限動腳本", "AI CTA", "AI 標題", "AI Hashtag", "AI 語氣調整", "AI 內容改寫"], live: true },
  { n: "02", key: "reports", name: "設計師作業回報", en: "Designer Work Reports", icon: ClipboardCheck,
    problem: "設計師今天做了什麼？主管看不到。",
    core: "每天回報限動、詢問、預約、業績，每週回報影片與貼文——主管一眼就能看到誰達標、誰卡關。",
    features: ["每日限動回報", "每日詢問／預約數", "每日業績回報", "每週影片／貼文回報", "後台監控", "目標篇數設定"], live: true },
];

const BASE_MODULES = [
  { name: "使用者與權限", icon: Users, items: ["設計師", "主管", "教育長", "行銷人員", "管理員"], note: "每個角色看到的內容不同。" },
  { name: "品牌知識庫", icon: BookOpen, items: ["品牌定位", "語氣規範", "服務內容", "顧客痛點", "禁用詞", "成功案例", "過去內容", "SOP"], note: "這是 AI 能不能產出「像 MULTIPLY」內容的關鍵。" },
  { name: "資料整合", icon: Link2, items: ["Instagram", "Threads", "TikTok", "LINE", "預約系統", "Google Calendar", "Notion", "CRM", "業績系統"], note: "未來可以串接的外部系統。" },
];

const CYCLE = ["找到題目", "產出內容", "追蹤成效"];

const CONTENT_TYPES = [
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

function buildDailyTopicsPrompt(profile) {
  const filled = (v) => (v && v.trim() ? v.trim() : "未提供");
  return `你是 MULTIPLY 沙龍的社群內容策略顧問，要根據一位設計師的個人資料，幫他發想「每日內容題目」。

設計師個人資料：
- 擅長服務：${filled(profile.service)}
- 目標客群：${filled(profile.audience)}
- 個人語氣：${filled(profile.tone)}
- 客單價：${filled(profile.price)}
- 個人特色：${filled(profile.trait)}
- 不想使用的詞彙：${filled(profile.avoid)}

規則：
1. 全程繁體中文。
2. 輸出剛好 5 個題目，每行一個，格式為「題目 — 一句話說明為什麼值得看」。
3. 不要加編號或項目符號。
4. 絕對不要使用「不想使用的詞彙」中列出的字詞。`;
}

/* ---------- shared bits ---------- */

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
    const angle = (-90 + i * (360 / LAYERS.length)) * (Math.PI / 180);
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
        兩層節點皆已標示 <span style={{ color: TOKENS.gold }}>綠點</span>，代表可實際操作與儲存資料。
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

/* ---------- shared: profile field ---------- */

function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: TOKENS.inkFaint, marginBottom: 5 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

/* ---------- Layer 01: Content Strategy & AI Assistant ---------- */

function ContentPanel() {
  const userId = useUserId();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const saveTimeout = useRef(null);

  const [topicFocus, setTopicFocus] = useState("");
  const [topics, setTopics] = useState([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(null);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState("");

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

  const generateTopics = async () => {
    setTopicsError(""); setTopicsLoading(true); setTopics([]); setSelectedTopicIndex(null);
    try {
      const response = await callClaude(
        buildDailyTopicsPrompt(profile),
        topicFocus.trim() ? `這次想聚焦：${topicFocus.trim()}` : "請自由發想本週題目",
        600
      );
      const lines = response.split("\n").map((l) => l.replace(/^[\-•\d\.\s]+/, "").trim()).filter(Boolean);
      const parsed = lines.map((l) => {
        const idx = l.search(/[—-]/);
        if (idx === -1) return { title: l, reason: "" };
        return { title: l.slice(0, idx).trim(), reason: l.slice(idx + 1).replace(/^[—-]\s*/, "").trim() };
      });
      if (!parsed.length) throw new Error("AI 回傳了空白內容，請再試一次。");
      setTopics(parsed);
    } catch (e) { setTopicsError(e.message || "生成失敗，請再試一次。"); } finally { setTopicsLoading(false); }
  };

  const selectTopic = (i) => {
    setSelectedTopicIndex(i);
    setTopic(topics[i].title);
  };

  const generate = async () => {
    if (!topic.trim()) { setError("請先選一個題目，或直接填寫內容需求。"); return; }
    setError(""); setLoading(true); setOutput("");
    try {
      const userMessage = type.needsSource ? `原始文案：\n${topic}` : `主題／需求：${topic}`;
      const text = await callClaude(buildSystemPrompt(profile, type), userMessage, 1000);
      setOutput(text);
    } catch (e) { setError(e.message || "生成失敗，請再試一次。"); } finally { setLoading(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };

  return (
    <div style={{ marginTop: 8 }}>
      <InfoNote>AI 生成全部根據下方的個人資料客製化。先產生每日題目、選一個，再挑內容類型，就能直接產出成稿。</InfoNote>
      <div className="grid-sidebar" style={{ marginTop: 16 }}>
        <div>
          <div style={{ ...cardStyle, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>設計師個人資料</span>
              <span style={{ fontSize: 10.5, color: saveState === "saving" ? TOKENS.gold : TOKENS.inkFaint }}>{saveState === "saving" ? "儲存中…" : saveState === "saved" ? "已自動儲存" : profileLoaded ? "" : "載入中…"}</span>
            </div>
            {PROFILE_FIELDS.map((f) => <Field key={f.key} label={f.label} value={profile[f.key]} onChange={(v) => setProfileField(f.key, v)} placeholder={f.placeholder} />)}
          </div>

          <div style={{ ...cardStyle, marginBottom: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>AI 每日內容題目</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input value={topicFocus} onChange={(e) => setTopicFocus(e.target.value)} placeholder="想聚焦的方向（可留空）" style={{ flex: 1, ...inputStyle }} />
              <button onClick={generateTopics} disabled={topicsLoading} style={primaryBtnStyle(topicsLoading)}>{topicsLoading ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />} 產生</button>
            </div>
            {topicsError && <p style={{ color: "#C77A6B", fontSize: 12.5, margin: "0 0 8px" }}>{topicsError}</p>}
            {topics.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {topics.map((t, i) => (
                  <button key={i} onClick={() => selectTopic(i)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, border: `1px solid ${selectedTopicIndex === i ? TOKENS.gold : TOKENS.line}`, background: selectedTopicIndex === i ? "rgba(201,160,99,0.14)" : TOKENS.bgElev, cursor: "pointer" }}>
                    <span style={{ fontSize: 12.5, color: selectedTopicIndex === i ? TOKENS.gold : TOKENS.ink, fontWeight: 600 }}>{t.title}</span>
                    {t.reason && <span style={{ fontSize: 12.5, color: TOKENS.inkFaint }}> — {t.reason}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>內容類型</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {CONTENT_TYPES.map((t) => <button key={t.id} onClick={() => setTypeId(t.id)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12.5, border: `1px solid ${typeId === t.id ? TOKENS.gold : TOKENS.line}`, background: typeId === t.id ? TOKENS.gold : "transparent", color: typeId === t.id ? TOKENS.bg : TOKENS.inkDim, cursor: "pointer" }}>{t.label}</button>)}
            </div>
            <label style={{ display: "block", fontSize: 12, color: TOKENS.inkFaint, marginBottom: 6 }}>{type.placeholder}</label>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} placeholder={type.needsSource ? "貼上原始文案內容…" : "選一個上方的題目，或直接輸入需求…"} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
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
            : <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: TOKENS.inkFaint, textAlign: "center" }}><MessageSquareText size={26} strokeWidth={1.3} style={{ marginBottom: 10, opacity: 0.6 }} /><p style={{ fontSize: 13, margin: 0, maxWidth: 240, lineHeight: 1.8 }}>先產生每日題目並選一個，或直接填寫需求，按下「產出內容」查看結果。</p></div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Layer 02: Designer Work Reports ---------- */

function getWeekStart(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function NumberField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <label style={{ fontSize: 13, color: TOKENS.inkDim }}>{label}</label>
      <input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" style={{ width: 100, ...inputStyle, textAlign: "right" }} />
    </div>
  );
}
function AchievementBadge({ achieved, label }) {
  return (
    <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, border: `1px solid ${achieved ? TOKENS.gold : TOKENS.line}`, color: achieved ? TOKENS.gold : TOKENS.inkFaint, whiteSpace: "nowrap" }}>{achieved ? "✓ " : ""}{label}</span>
  );
}

function DesignerReportsView({ userId }) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStart();

  const [settings, setSettings] = useState({ daily_story_target: 5, weekly_video_target: 1, weekly_post_target: 1 });
  const [daily, setDaily] = useState({ stories_count: "", inquiries_count: "", bookings_count: "", technical_revenue: "", retail_revenue: "" });
  const [dailySaving, setDailySaving] = useState(false);
  const [dailySaved, setDailySaved] = useState(false);
  const [weekly, setWeekly] = useState({ videos_count: "", posts_count: "" });
  const [weeklySaving, setWeeklySaving] = useState(false);
  const [weeklySaved, setWeeklySaved] = useState(false);

  useEffect(() => {
    (async () => {
      try { setSettings(await getSettings()); } catch (e) {}
      try {
        const row = await getDailyReport(userId, todayKey);
        if (row) setDaily({ stories_count: row.stories_count, inquiries_count: row.inquiries_count, bookings_count: row.bookings_count, technical_revenue: row.technical_revenue, retail_revenue: row.retail_revenue });
      } catch (e) {}
      try {
        const row = await getWeeklyReport(userId, weekStart);
        if (row) setWeekly({ videos_count: row.videos_count, posts_count: row.posts_count });
      } catch (e) {}
    })();
  }, [userId]);

  const setDailyField = (key, v) => setDaily((prev) => ({ ...prev, [key]: v }));
  const setWeeklyField = (key, v) => setWeekly((prev) => ({ ...prev, [key]: v }));

  const saveDaily = async () => {
    setDailySaving(true);
    try {
      await upsertDailyReport(userId, todayKey, {
        stories_count: Number(daily.stories_count) || 0,
        inquiries_count: Number(daily.inquiries_count) || 0,
        bookings_count: Number(daily.bookings_count) || 0,
        technical_revenue: Number(daily.technical_revenue) || 0,
        retail_revenue: Number(daily.retail_revenue) || 0,
      });
      setDailySaved(true); setTimeout(() => setDailySaved(false), 1500);
    } catch (e) {} finally { setDailySaving(false); }
  };

  const saveWeekly = async () => {
    setWeeklySaving(true);
    try {
      await upsertWeeklyReport(userId, weekStart, {
        videos_count: Number(weekly.videos_count) || 0,
        posts_count: Number(weekly.posts_count) || 0,
      });
      setWeeklySaved(true); setTimeout(() => setWeeklySaved(false), 1500);
    } catch (e) {} finally { setWeeklySaving(false); }
  };

  const storiesAchieved = (Number(daily.stories_count) || 0) >= settings.daily_story_target;
  const videosAchieved = (Number(weekly.videos_count) || 0) >= settings.weekly_video_target;
  const postsAchieved = (Number(weekly.posts_count) || 0) >= settings.weekly_post_target;

  return (
    <div style={{ marginTop: 8 }}>
      <InfoNote>每日回報請於當天填寫；每週回報請於週日前完成本週的影片與貼文數。</InfoNote>
      <div className="grid-2col" style={{ marginTop: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>今日回報 — {todayKey}</span>
            <AchievementBadge achieved={storiesAchieved} label={`限動 ${Number(daily.stories_count) || 0}/${settings.daily_story_target}`} />
          </div>
          <NumberField label="限動篇數" value={daily.stories_count} onChange={(v) => setDailyField("stories_count", v)} />
          <NumberField label="詢問數" value={daily.inquiries_count} onChange={(v) => setDailyField("inquiries_count", v)} />
          <NumberField label="預約數" value={daily.bookings_count} onChange={(v) => setDailyField("bookings_count", v)} />
          <NumberField label="技術業績" value={daily.technical_revenue} onChange={(v) => setDailyField("technical_revenue", v)} />
          <NumberField label="店販業績" value={daily.retail_revenue} onChange={(v) => setDailyField("retail_revenue", v)} />
          <button onClick={saveDaily} disabled={dailySaving} style={{ ...primaryBtnStyle(dailySaving), width: "100%", marginTop: 10 }}>{dailySaved ? <Check size={16} /> : null}{dailySaved ? "已儲存" : dailySaving ? "儲存中…" : "儲存今日回報"}</button>
        </div>
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>本週回報 — {weekStart} 起</span>
            <div style={{ display: "flex", gap: 6 }}>
              <AchievementBadge achieved={videosAchieved} label={`影片 ${Number(weekly.videos_count) || 0}/${settings.weekly_video_target}`} />
              <AchievementBadge achieved={postsAchieved} label={`貼文 ${Number(weekly.posts_count) || 0}/${settings.weekly_post_target}`} />
            </div>
          </div>
          <NumberField label="本週影片數" value={weekly.videos_count} onChange={(v) => setWeeklyField("videos_count", v)} />
          <NumberField label="本週貼文數" value={weekly.posts_count} onChange={(v) => setWeeklyField("posts_count", v)} />
          <button onClick={saveWeekly} disabled={weeklySaving} style={{ ...primaryBtnStyle(weeklySaving), width: "100%", marginTop: 10 }}>{weeklySaved ? <Check size={16} /> : null}{weeklySaved ? "已儲存" : weeklySaving ? "儲存中…" : "儲存本週回報"}</button>
        </div>
      </div>
    </div>
  );
}

function AdminReportsView() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStart();

  const [settings, setSettings] = useState({ daily_story_target: 5, weekly_video_target: 1, weekly_post_target: 1 });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [designers, setDesigners] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try { setSettings(await getSettings()); } catch (e) {}
    try { setDesigners(await getAllDesignerProfiles()); } catch (e) {}
    try { setDailyReports(await getAllDailyReportsForDate(todayKey)); } catch (e) {}
    try { setWeeklyReports(await getAllWeeklyReportsForWeek(weekStart)); } catch (e) {}
    setLoaded(true);
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await updateSettings({
        daily_story_target: Number(settings.daily_story_target) || 0,
        weekly_video_target: Number(settings.weekly_video_target) || 0,
        weekly_post_target: Number(settings.weekly_post_target) || 0,
      });
      setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 1500);
    } catch (e) {} finally { setSettingsSaving(false); }
  };

  const dailyByUser = Object.fromEntries(dailyReports.map((r) => [r.user_id, r]));
  const weeklyByUser = Object.fromEntries(weeklyReports.map((r) => [r.user_id, r]));

  return (
    <div style={{ marginTop: 8 }}>
      <InfoNote>管理者畫面：可設定目標篇數，並監控所有設計師今天／本週的回報狀態。</InfoNote>

      <div style={{ ...cardStyle, marginTop: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>目標設定</div>
        <div className="grid-2col">
          <NumberField label="每日限動目標篇數" value={settings.daily_story_target} onChange={(v) => setSettings((s) => ({ ...s, daily_story_target: v }))} />
          <div>
            <NumberField label="每週影片目標" value={settings.weekly_video_target} onChange={(v) => setSettings((s) => ({ ...s, weekly_video_target: v }))} />
            <NumberField label="每週貼文目標" value={settings.weekly_post_target} onChange={(v) => setSettings((s) => ({ ...s, weekly_post_target: v }))} />
          </div>
        </div>
        <button onClick={saveSettings} disabled={settingsSaving} style={{ ...primaryBtnStyle(settingsSaving), width: "100%", marginTop: 10 }}>{settingsSaved ? <Check size={16} /> : null}{settingsSaved ? "已儲存" : settingsSaving ? "儲存中…" : "儲存目標設定"}</button>
      </div>

      <SectionLabel>設計師監控 — 今日 {todayKey} ／ 本週 {weekStart} 起</SectionLabel>
      <div style={{ ...cardStyle, marginTop: 14, overflowX: "auto" }}>
        {!loaded ? (
          <span style={{ fontSize: 12.5, color: TOKENS.inkFaint }}>載入中…</span>
        ) : designers.length === 0 ? (
          <span style={{ fontSize: 12.5, color: TOKENS.inkFaint }}>尚無其他設計師帳號</span>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: "left", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                <th style={{ padding: "6px 8px" }}>設計師</th>
                <th style={{ padding: "6px 8px" }}>今日限動</th>
                <th style={{ padding: "6px 8px" }}>詢問數</th>
                <th style={{ padding: "6px 8px" }}>預約數</th>
                <th style={{ padding: "6px 8px" }}>技術業績</th>
                <th style={{ padding: "6px 8px" }}>店販業績</th>
                <th style={{ padding: "6px 8px" }}>本週影片</th>
                <th style={{ padding: "6px 8px" }}>本週貼文</th>
              </tr>
            </thead>
            <tbody>
              {designers.map((d) => {
                const dr = dailyByUser[d.id];
                const wr = weeklyByUser[d.id];
                const storiesOk = dr && dr.stories_count >= settings.daily_story_target;
                const videosOk = wr && wr.videos_count >= settings.weekly_video_target;
                const postsOk = wr && wr.posts_count >= settings.weekly_post_target;
                return (
                  <tr key={d.id} style={{ borderTop: `1px solid ${TOKENS.line}` }}>
                    <td style={{ padding: "8px" }}>{d.email || d.id.slice(0, 8)}</td>
                    <td style={{ padding: "8px", color: dr ? (storiesOk ? TOKENS.gold : "#C77A6B") : TOKENS.inkFaint }}>{dr ? `${dr.stories_count}/${settings.daily_story_target}` : "未回報"}</td>
                    <td style={{ padding: "8px" }}>{dr ? dr.inquiries_count : "—"}</td>
                    <td style={{ padding: "8px" }}>{dr ? dr.bookings_count : "—"}</td>
                    <td style={{ padding: "8px" }}>{dr ? dr.technical_revenue : "—"}</td>
                    <td style={{ padding: "8px" }}>{dr ? dr.retail_revenue : "—"}</td>
                    <td style={{ padding: "8px", color: wr ? (videosOk ? TOKENS.gold : "#C77A6B") : TOKENS.inkFaint }}>{wr ? `${wr.videos_count}/${settings.weekly_video_target}` : "未回報"}</td>
                    <td style={{ padding: "8px", color: wr ? (postsOk ? TOKENS.gold : "#C77A6B") : TOKENS.inkFaint }}>{wr ? `${wr.posts_count}/${settings.weekly_post_target}` : "未回報"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ReportsPanel() {
  const userId = useUserId();
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try { setProfile(await getProfile(userId)); } catch (e) {}
      finally { setLoaded(true); }
    })();
  }, [userId]);

  if (!loaded) return <InfoNote>載入中…</InfoNote>;
  return profile?.is_admin ? <AdminReportsView /> : <DesignerReportsView userId={userId} />;
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

      {layer.key === "content" && <ContentPanel />}
      {layer.key === "reports" && <ReportsPanel />}
    </div>
  );
}

/* ---------- app ---------- */

export default function MultiplyCreatorOS({ user }) {
  const [active, setActive] = useState(0);
  const router = useRouter();
  const signOut = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  useEffect(() => {
    if (!user?.id) return;
    upsertProfile(user.id, { email: user.email || "" }).catch(() => {});
  }, [user?.id, user?.email]);

  return (
    <UserIdContext.Provider value={user?.id}>
      <div style={{ background: TOKENS.bg, minHeight: "100%", color: TOKENS.ink, fontFamily: "'Noto Sans TC', sans-serif", padding: "36px 20px 64px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 6, position: "relative" }}>
            <Sparkles size={14} color={TOKENS.gold} />
            <span style={{ fontSize: 11.5, letterSpacing: "0.14em", color: TOKENS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>ALL 2 LAYERS LIVE</span>
            <button onClick={signOut} title="登出" style={{ position: "absolute", right: 0, display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${TOKENS.line}`, borderRadius: 999, padding: "5px 12px", color: TOKENS.inkDim, fontSize: 11.5, cursor: "pointer" }}>
              <LogOut size={12} /> 登出
            </button>
          </div>
          <h1 style={{ textAlign: "center", fontFamily: "'Noto Serif TC', serif", fontSize: "clamp(26px,5vw,38px)", fontWeight: 700, margin: "0 0 10px" }}>MULTIPLY Creator OS</h1>
          <p style={{ textAlign: "center", color: TOKENS.inkDim, fontSize: 14.5, margin: "0 0 8px" }}>兩層內容作業系統 — 從找到題目，到再進入下一輪</p>
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
