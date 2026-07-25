import { supabase } from "./supabaseClient";

export async function callClaude(system, userMessage, maxTokens = 800) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ system, message: userMessage, maxTokens }),
    });
  } catch (e) {
    throw new Error("網路連線失敗，請確認連線後再試一次。");
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(`伺服器回應無法解析（狀態碼 ${response.status}）`);
  }
  if (!response.ok) {
    throw new Error(data?.error || `API 回傳錯誤（狀態碼 ${response.status}）`);
  }
  if (!data.text) throw new Error("AI 回傳了空白內容，請再試一次。");
  return data.text;
}
