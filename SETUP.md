# MULTIPLY Creator OS — 部署設定指南

這份專案需要三個帳號：Anthropic（AI 生成）、Supabase（資料庫＋登入）、Vercel（網站託管）。
以下步驟需要你親自操作（帳號申請、付款資訊、金鑰複製都無法代勞），我在旁邊補充每一步在做什麼。

## 1. 申請 Anthropic API Key

1. 前往 https://console.anthropic.com/ 註冊或登入。
2. 左側選單找到 **API Keys**，點 **Create Key**，複製產生的金鑰（`sk-ant-...`，離開頁面後就看不到了，先存起來）。
3. 到 **Billing** 頁面加入付款方式並儲值（AI 生成功能是用量計費，用多少扣多少）。
4. 把金鑰貼給我，或直接填進 `.env.local`（見第 4 步）。

## 2. 建立 Supabase 專案

1. 前往 https://supabase.com/ 用 GitHub 或 Email 註冊。
2. 點 **New project**，選一個名稱（例如 `multiply-creator-os`）、資料庫密碼（存好，之後備份/還原會用到）、離台灣近的 Region（例如 Singapore）。
3. 專案建立後，進 **SQL Editor** → **New query**，把這個專案裡的 [supabase/schema.sql](supabase/schema.sql) 整份貼進去執行一次，會建好所有資料表跟權限規則。
4. 進 **Project Settings → API**，複製兩個值：
   - **Project URL** → 就是 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → 就是 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. （可選）**Authentication → Providers → Email**：預設會要求 Email 驗證信才能登入。如果想讓設計師註冊後直接用，把 **Confirm email** 關掉即可。

## 3. 建立 Vercel 帳號並部署

1. 先把這個資料夾推上 GitHub（一個新的 repo，例如 `multiply-creator-os`）。
2. 前往 https://vercel.com/ 用 GitHub 帳號登入，點 **Add New → Project**，選剛剛的 repo。
3. 在 **Environment Variables** 這一步，加入三個變數（值就是前面拿到的）：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
4. 按 **Deploy**，等建置完成，Vercel 會給你一個網址（例如 `multiply-creator-os.vercel.app`），設計師之後就是用這個網址登入。
5. 之後每次改程式碼、推到 GitHub，Vercel 會自動重新部署，不用手動操作。

## 4. 本機測試（可選）

如果想在自己電腦上先試跑：

```bash
cp .env.example .env.local
```

打開 `.env.local`，把三個值換成第 1、2 步拿到的真實金鑰，然後：

```bash
npm install
npm run dev
```

打開 http://localhost:3000 即可測試。

## 設計師怎麼用

給設計師 Vercel 網址，第一次使用點「還沒有帳號？註冊一個」，用自己的 email + 密碼建立帳號即可。每位設計師的個人資料、每日任務、成長紀錄只有自己看得到；內容行事曆、資料庫、草稿看板、排行榜是全隊共用。

## 目前已知的限制

- 影片自動化（自動剪停頓、字幕、9:16 裁切、人臉追蹤）只有介面，沒有真正的影片處理引擎。
- 數據儀表板是手動輸入，還沒接 Instagram／預約系統等真實數據源。
- 目前所有登入帳號權限相同（沒有「主管」「教育長」等角色區分），這是下一步可以做的功能。
