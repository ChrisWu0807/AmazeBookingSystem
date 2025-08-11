# 🚀 Zeabur 部署指南

## 📋 部署前準備

### 1. 環境變數設定
在 Zeabur 專案設定中，需要配置以下環境變數：

#### **Google OAuth 2.0 憑證** (必需)
```
GOOGLE_CLIENT_ID=679955325298-b79n0f5f0l40ktckv2ql52jr3dg9q1ef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://amaze-booking-system.zeabur.app/auth/callback
```

#### **伺服器配置** (可選，有預設值)
```
NODE_ENV=production
PORT=8080
```

### 2. Google OAuth 設定
1. 登入 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇你的專案
3. 前往 "APIs & Services" > "Credentials"
4. 編輯你的 OAuth 2.0 客戶端 ID
5. 在 "Authorized redirect URIs" 中添加：
   ```
   https://amaze-booking-system.zeabur.app/auth/callback
   ```

## 🔧 部署步驟

### 1. 推送到 Git 倉庫
```bash
git add .
git commit -m "Prepare for Zeabur deployment"
git push origin main
```

### 2. 在 Zeabur 中部署
1. 連接到你的 Git 倉庫
2. 選擇 `main` 分支
3. 設定環境變數（如上所述）
4. 部署專案

### 3. 首次 OAuth 授權
部署完成後，需要進行首次 OAuth 授權：

1. 訪問：`https://amaze-booking-system.zeabur.app/auth`
2. 點擊 "授權 Google Calendar 存取"
3. 完成 Google 授權流程
4. 授權成功後，系統會自動保存令牌

## ⚠️ 重要注意事項

### 1. 令牌管理
- 首次授權後，系統會顯示需要設定的環境變數
- 建議將這些令牌設定為 Zeabur 環境變數：
  ```
  GOOGLE_ACCESS_TOKEN=your_access_token
  GOOGLE_REFRESH_TOKEN=your_refresh_token
  GOOGLE_TOKEN_EXPIRY=your_expiry_timestamp
  ```

### 2. 資料庫
- 本專案已移除 SQLite 資料庫依賴
- 所有預約資料都直接儲存在 Google Calendar 中
- 不需要額外的資料庫服務

### 3. 檔案系統
- 在 Zeabur 的無狀態環境中，檔案系統可能不可靠
- Token 儲存已改為優先使用環境變數
- 本地開發時仍可使用檔案儲存

## 🧪 測試部署

### 1. 健康檢查
```
GET https://amaze-booking-system.zeabur.app/api/health
```

### 2. 預約功能測試
1. 創建新預約
2. 查詢預約
3. 更新預約狀態
4. 刪除預約

### 3. OAuth 流程測試
1. 訪問授權頁面
2. 完成 Google 授權
3. 檢查預約同步功能

## 🔍 故障排除

### 1. 常見錯誤
- **401 Unauthorized**: 檢查 OAuth 憑證和令牌
- **404 Not Found**: 檢查路由配置
- **500 Internal Server Error**: 檢查環境變數設定

### 2. 日誌檢查
在 Zeabur 控制台中查看應用日誌，尋找錯誤訊息

### 3. 重新授權
如果令牌過期，可以重新訪問授權頁面進行授權

## 📞 支援
如果遇到問題，請檢查：
1. 環境變數是否正確設定
2. Google OAuth 憑證是否有效
3. 重定向 URI 是否正確
4. 應用日誌中的錯誤訊息 