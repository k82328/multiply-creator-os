"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const TOKENS = {
  bg: "#131209",
  bgElev: "#1C1A12",
  ink: "#F1EADA",
  inkDim: "#A79A80",
  inkFaint: "#6E6552",
  line: "#39321F",
  gold: "#C9A063",
  goldDim: "#8A7047",
};

const inputStyle = {
  width: "100%",
  background: "#211E15",
  border: `1px solid ${TOKENS.line}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: TOKENS.ink,
  fontSize: 14,
  outline: "none",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice("註冊成功。若專案開啟了 Email 驗證，請先查收信箱完成驗證後再登入。");
        setMode("signin");
      }
    } catch (err) {
      setError(err.message || "發生錯誤，請再試一次。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: TOKENS.bg,
        padding: 20,
        fontFamily: "'Noto Sans TC', sans-serif",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 360,
          background: TOKENS.bgElev,
          border: `1px solid ${TOKENS.line}`,
          borderRadius: 20,
          padding: 32,
        }}
      >
        <h1
          style={{
            fontFamily: "'Noto Serif TC', serif",
            fontSize: 24,
            color: TOKENS.ink,
            textAlign: "center",
            margin: "0 0 6px",
          }}
        >
          MULTIPLY Creator OS
        </h1>
        <p style={{ textAlign: "center", color: TOKENS.inkFaint, fontSize: 13, margin: "0 0 28px" }}>
          {mode === "signin" ? "設計師登入" : "建立新帳號"}
        </p>

        <label style={{ display: "block", fontSize: 12, color: TOKENS.inkFaint, marginBottom: 6 }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <label style={{ display: "block", fontSize: 12, color: TOKENS.inkFaint, margin: "14px 0 6px" }}>密碼</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {error && <p style={{ color: "#C77A6B", fontSize: 12.5, marginTop: 12 }}>{error}</p>}
        {notice && <p style={{ color: TOKENS.gold, fontSize: 12.5, marginTop: 12 }}>{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: loading ? TOKENS.goldDim : TOKENS.gold,
            color: TOKENS.bg,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "處理中…" : mode === "signin" ? "登入" : "註冊"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setNotice("");
          }}
          style={{
            width: "100%",
            marginTop: 12,
            padding: 8,
            background: "none",
            border: "none",
            color: TOKENS.inkDim,
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          {mode === "signin" ? "還沒有帳號？註冊一個" : "已經有帳號？登入"}
        </button>
      </form>
    </div>
  );
}
