import { createClient } from "@supabase/supabase-js";

async function getUserFromRequest(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user;
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return Response.json({ error: "請先登入。" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const message = body?.message;
  if (!message || typeof message !== "string") {
    return Response.json({ error: "缺少內容需求。" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "伺服器尚未設定 ANTHROPIC_API_KEY。" }, { status: 500 });
  }

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: body?.maxTokens || 800,
        system: body?.system || undefined,
        messages: [{ role: "user", content: message }],
      }),
    });
  } catch (e) {
    return Response.json({ error: "呼叫 AI 服務失敗，請稍後再試。" }, { status: 502 });
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const msg = data?.error?.message || `API 回傳錯誤（狀態碼 ${upstream.status}）`;
    return Response.json({ error: msg }, { status: upstream.status });
  }

  const text = (data?.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) {
    return Response.json({ error: "AI 回傳了空白內容，請再試一次。" }, { status: 502 });
  }
  return Response.json({ text });
}
