# 🎯 Amaze 預約系統

專為客戶設計的線上預約管理平台，提供直觀的預約登記和 Google Calendar 自動同步功能。

## 🏗️ 系統架構

### 技術棧
- **前端**：React 18 + React Router + Axios + Lucide React
- **後端**：Node.js + Express.js + Google Calendar API
- **認證**：Google OAuth 2.0
- **部署**：Vercel / Zeabur / Ubuntu 伺服器

### 端口配置
- **後端 API**：http://localhost:3050
- **前端應用**：http://localhost:3000

## 📁 專案結構

```
Amaze_Booking_System/
├── client/                 # 前端 React 應用
│   ├── src/
│   │   ├── components/     # React 組件
│   │   │   ├── Header.js
│   │   │   ├── ReservationForm.js
│   │   │   ├── ApiTest.js
│   │   │   ├── SimpleTest.js
│   │   │   └── DebugSchedule.js
│   │   ├── config/         # 配置文件
│   │   │   └── api.js      # API 配置
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                 # 後端 API 伺服器
│   ├── index-oauth.js     # OAuth 版本主伺服器
│   ├── googleCalendar-oauth.js # Google Calendar OAuth 服務
│   ├── oauth-setup.md     # OAuth 設置說明
│   └── package.json
├── package.json           # 根目錄配置
├── vercel.json           # Vercel 部署配置
├── zeabur.toml          # Zeabur 部署配置
├── DEPLOYMENT.md        # 詳細部署指南
└── README.md            # 專案說明文件
```

## 🚀 快速啟動

### 1. 安裝依賴
```bash
npm run install-all
```

### 2. 配置 Google OAuth 2.0
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用 Google Calendar API
4. 創建 OAuth 2.0 憑證
5. 設定重定向 URI：`http://localhost:3050/auth/google/callback`

### 3. 設置環境變數
在 `server/.env` 檔案中填入：
```env
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3050/auth/google/callback
PORT=3050
NODE_ENV=development
```

### 4. 啟動系統
```bash
npm run dev
```

## 🌐 雲端部署

### 🎯 Vercel 部署（推薦）
```bash
# 1. 推送到 GitHub
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main

# 2. 連接 Vercel
# 前往 https://vercel.com/dashboard
# 選擇 GitHub 倉庫並部署
```

### 🎯 Zeabur 部署
```bash
# 1. 推送到 GitHub
git add .
git commit -m "Prepare for Zeabur deployment"
git push origin main

# 2. 連接 Zeabur
# 前往 https://zeabur.com/
# 選擇 GitHub 倉庫並部署
```

### 🎯 Ubuntu 伺服器部署
詳細步驟請參考 [DEPLOYMENT.md](./DEPLOYMENT.md)

## ✨ 功能特色

### 客戶預約表單
- ✅ 客戶姓名、電話號碼
- ✅ 預約日期選擇（不能選擇過去日期）
- ✅ 時段按鈕選擇（09:00-20:00，每小時一單位）
- ✅ 動態排除已預約時段
- ✅ 備註欄位
- ✅ 即時驗證和錯誤提示

### Google Calendar 整合
- ✅ 使用主帳號 OAuth 2.0 認證
- ✅ 自動同步預約到 Google Calendar
- ✅ 完整事件資訊（姓名、電話、備註、狀態）
- ✅ 時區正確（Asia/Taipei）
- ✅ 提醒設定（1天前 email + 30分鐘前彈窗）
- ✅ 藍色事件標示

### 後端 API
- ✅ `POST /api/reservations` - 新增預約
- ✅ `GET /api/reservations/date/:date` - 查詢特定日期預約
- ✅ `GET /api/auth/status` - 檢查認證狀態
- ✅ `GET /api/auth/url` - 獲取授權 URL
- ✅ `GET /api/health` - 健康檢查

## 🔐 OAuth 2.0 認證流程

1. **用戶訪問預約系統**
2. **系統檢查認證狀態**
3. **如需認證，重定向到 Google OAuth**
4. **用戶授權應用程式**
5. **系統獲取 access token**
6. **預約直接同步到 Google Calendar**

## 📅 事件格式

Google Calendar 事件包含：
```
📅 客戶預約 - [客戶姓名]
📞 電話：[電話號碼]
📝 備註：[備註內容]
✅ 狀態：[確認狀態]
🕐 預約時間：[日期時間]
```

## 🎨 前端特色

### 時段選擇
- 按鈕式時段選擇（非下拉選單）
- 動態排除已預約時段
- 視覺化選中狀態
- 響應式設計（手機、平板、桌面）

### 用戶體驗
- 簡潔的客戶預約介面
- 即時錯誤提示
- 載入狀態指示
- 成功訊息回饋

## 🔧 配置說明

### 動態環境變數支援
- ✅ 支援 Vercel 自動環境變數
- ✅ 支援 Zeabur 環境變數
- ✅ 支援自定義域名
- ✅ 自動檢測生產/開發環境

### API 配置
- ✅ 動態 API 基礎 URL
- ✅ 生產環境相對路徑
- ✅ 開發環境代理配置
- ✅ 錯誤處理和重試

### OAuth 配置
- ✅ 動態重定向 URI
- ✅ 支援多種部署平台
- ✅ 自動環境檢測
- ✅ 安全的憑證管理

## 🔒 安全性

- 輸入驗證防止無效資料
- 時段衝突檢查避免重複預約
- OAuth 2.0 安全認證
- 環境變數保護敏感資訊
- CORS 配置
- Helmet 安全中間件

## 📞 技術支援

如需進一步協助，請提供：
1. 錯誤訊息截圖
2. 瀏覽器開發者工具日誌
3. 伺服器控制台輸出
4. 具體功能需求描述

## 📝 更新日誌

### v3.0.0 - 雲端部署版本
- ✅ 支援 Vercel 自動部署
- ✅ 支援 Zeabur 自動部署
- ✅ 動態環境變數配置
- ✅ 動態 API URL 配置
- ✅ 改進的錯誤處理
- ✅ 詳細部署文檔

### v2.0.0 - OAuth 2.0 版本
- ✅ 改用 Google OAuth 2.0 認證
- ✅ 使用主帳號 Google Calendar
- ✅ 移除 Service Account 依賴
- ✅ 簡化部署流程
- ✅ 支援 GitHub Pages 部署

### v1.0.0 - Service Account 版本
- ✅ 基本預約功能
- ✅ Google Calendar 同步
- ✅ 資料庫儲存
- ✅ 時段衝突檢查 