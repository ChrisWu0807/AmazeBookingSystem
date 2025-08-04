# Google OAuth 2.0 設置說明

## 1. 創建 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用 Google Calendar API

## 2. 創建 OAuth 2.0 憑證

1. 在 Google Cloud Console 中，前往「API 和服務」>「憑證」
2. 點擊「建立憑證」>「OAuth 2.0 用戶端 ID」
3. 選擇「網頁應用程式」
4. 設定授權的重定向 URI：`https://your-domain.com/auth/google/callback`
5. 複製客戶端 ID 和客戶端密鑰

## 3. 配置環境變數

在 `server/.env` 檔案中填入：

```env
# Google OAuth 2.0 配置
GOOGLE_CLIENT_ID=your_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_oauth_client_secret_here
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# 伺服器配置
PORT=3050
```

## 4. 啟動系統

```bash
cd server
node index-oauth.js
```

## 5. 完成認證

1. 訪問：https://your-domain.com/api/auth/url
2. 點擊授權連結
3. 登入您的 Google 帳號
4. 授權應用程式存取您的 Google Calendar
5. 完成認證後，預約將直接同步到您的主要日曆

## 注意事項

- 此版本使用您的主 Google 帳號
- 預約會直接同步到您的主要日曆
- 不需要 Service Account
- 需要手動完成 OAuth 認證流程
- 部署後需要更新重定向 URI 