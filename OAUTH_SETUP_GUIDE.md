# 🔐 OAuth 2.0 設置指南

## 🎯 概述

已將授權方式從服務帳戶改為 OAuth 2.0，這樣可以：
- 使用真實用戶權限
- 避免複雜的日曆共享設置
- 更安全可靠

## 📋 設置步驟

### 步驟 1：獲取 OAuth 2.0 憑證

1. **前往 Google Cloud Console**
   - 訪問：https://console.cloud.google.com/
   - 選擇項目：`booking-system-468006`

2. **創建 OAuth 2.0 憑證**
   - 進入 **API 和服務** → **憑證**
   - 點擊 **+ 建立憑證** → **OAuth 用戶端 ID**
   - 應用程式類型：**網頁應用程式**
   - 名稱：`Amaze Booking OAuth`

3. **設置授權的重定向 URI**
   - 本地開發：`http://localhost:3050/auth/callback`
   - 生產環境：`https://your-domain.com/auth/callback`

4. **記錄憑證信息**
   - 用戶端 ID
   - 用戶端密鑰

### 步驟 2：配置環境變數

創建 `.env` 文件並填入：

```env
# Google OAuth 2.0 配置
GOOGLE_CLIENT_ID=你的用戶端ID
GOOGLE_CLIENT_SECRET=你的用戶端密鑰
GOOGLE_REDIRECT_URI=http://localhost:3050/auth/callback

# 服務器配置
PORT=3050
NODE_ENV=development
```

### 步驟 3：完成授權

1. **啟動服務器**
   ```bash
   cd server
   npm start
   ```

2. **獲取授權 URL**
   - 訪問：`http://localhost:3050/api/auth/google`
   - 複製返回的 `authUrl`

3. **完成授權**
   - 在瀏覽器中打開授權 URL
   - 登入 Google 帳戶
   - 授權應用程式訪問您的日曆

4. **驗證授權**
   - 訪問：`http://localhost:3050/api/auth/status`
   - 應該顯示 `"authorized": true`

## 🔧 API 端點

### 授權相關
- `GET /api/auth/google` - 生成授權 URL
- `GET /api/auth/callback` - 處理授權回調
- `GET /api/auth/status` - 檢查授權狀態
- `GET /api/auth/test` - 測試連接

### 預約相關
- `POST /api/reservations` - 創建預約
- `GET /api/reservations` - 獲取預約列表
- 其他現有端點保持不變

## 🚀 部署到生產環境

### 1. 更新重定向 URI
在 Google Cloud Console 中添加生產環境的重定向 URI：
```
https://your-domain.com/auth/callback
```

### 2. 設置環境變數
在 Zeabur 中設置：
```
GOOGLE_CLIENT_ID=你的用戶端ID
GOOGLE_CLIENT_SECRET=你的用戶端密鑰
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback
```

### 3. 完成授權
部署後，訪問授權端點完成授權流程。

## ✅ 優勢

1. **更簡單的權限管理** - 不需要處理服務帳戶權限
2. **更安全的憑證** - OAuth 2.0 更安全
3. **自動令牌刷新** - 系統會自動處理令牌過期
4. **更好的用戶體驗** - 使用真實用戶權限

## 🔍 故障排除

### 常見問題
1. **授權失敗** - 檢查重定向 URI 是否正確
2. **令牌過期** - 系統會自動刷新，如果失敗需要重新授權
3. **權限不足** - 確保在授權時選擇了日曆權限

### 重新授權
如果令牌過期且無法自動刷新：
1. 刪除 `tokens.json` 文件
2. 重新訪問授權 URL
3. 完成授權流程

---

**完成設置後，系統將使用 OAuth 2.0 進行 Google Calendar 操作，更加安全可靠！** 