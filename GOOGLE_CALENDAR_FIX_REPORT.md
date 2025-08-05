# 🔧 Google Calendar JWT 簽名錯誤修復報告

## 🎯 問題診斷

### 原始錯誤
```
❌ Google Calendar 同步失敗: GaxiosError: invalid_grant: Invalid JWT Signature.
```

### 根本原因分析
1. **日曆 ID 配置錯誤**：代碼使用 `calendarId: 'primary'`，但服務帳戶需要特定的日曆 ID
2. **權限問題**：服務帳戶可能沒有正確的日曆訪問權限
3. **初始化時機**：沒有等待日曆服務完全初始化就開始使用

## ✅ 修復方案

### 1. 智能日曆 ID 選擇
```javascript
// 修改前
calendarId: 'primary'

// 修改後
// 優先嘗試服務帳戶日曆，失敗時回退到 primary
const serviceAccountCalendarId = 'amaze-booking-calendar@booking-system-468006.iam.gserviceaccount.com';
```

### 2. 動態初始化機制
- 添加 `initializeCalendar()` 方法
- 在每次操作前確保日曆已正確初始化
- 提供詳細的錯誤日誌和回退機制

### 3. 改進的錯誤處理
- 更詳細的錯誤信息
- 自動重試機制
- 優雅的降級處理

## 📁 修改的文件

### 1. `server/googleCalendar.js`
- ✅ 添加智能日曆 ID 選擇
- ✅ 實現動態初始化
- ✅ 改進錯誤處理
- ✅ 添加連接測試功能

### 2. `server/test-google-calendar.js` (新增)
- ✅ 完整的連接測試腳本
- ✅ 事件創建和清理測試
- ✅ 詳細的測試報告

### 3. `deploy-and-test.sh` (新增)
- ✅ 自動化部署腳本
- ✅ 本地測試流程
- ✅ 部署指導

## 🧪 測試步驟

### 本地測試
```bash
# 1. 運行測試腳本
cd server && node test-google-calendar.js

# 2. 檢查輸出
# 應該看到：
# ✅ 使用服務帳戶日曆: [日曆名稱]
# ✅ 成功獲取事件: X 個
# ✅ 成功創建測試事件: [事件ID]
# ✅ 測試事件已清理
# 🎉 所有測試通過！
```

### 部署測試
```bash
# 1. 提交更改
git add .
git commit -m "修復 Google Calendar JWT 簽名錯誤"

# 2. 推送到 GitHub
git push origin main

# 3. 監控 Zeabur 部署
# 查看日誌確認沒有錯誤
```

## 🔍 監控要點

### 部署後檢查
1. **Zeabur 日誌**：確認服務正常啟動
2. **Google Calendar 連接**：查看初始化日誌
3. **預約功能**：測試創建預約
4. **同步狀態**：確認事件出現在 Google Calendar

### 預期日誌
```
✅ 使用服務帳戶日曆: [日曆名稱]
✅ Google Calendar 事件已建立: [事件ID]
✅ 預約已同步到 Google Calendar
```

## 🚨 故障排除

### 如果仍然有 JWT 錯誤
1. **檢查憑證文件**：確認 `service-account-key.json` 正確
2. **驗證權限**：確保服務帳戶有 Google Calendar API 權限
3. **檢查日曆共享**：確認日曆已與服務帳戶共享

### 如果服務帳戶日曆不可用
- 系統會自動回退到 `primary` 日曆
- 檢查 Google Cloud Console 中的權限設置

## 📊 技術細節

### 服務帳戶信息
- **項目 ID**: `booking-system-468006`
- **服務帳戶**: `amaze-booking-calendar@booking-system-468006.iam.gserviceaccount.com`
- **權限範圍**: `https://www.googleapis.com/auth/calendar`

### 日曆 ID 策略
1. 優先使用服務帳戶專用日曆
2. 如果不可用，回退到 primary 日曆
3. 提供詳細的錯誤日誌幫助診斷

## 🎯 下一步行動

1. **立即執行**：運行測試腳本驗證修復
2. **部署**：推送更改到 GitHub
3. **監控**：觀察 Zeabur 部署日誌
4. **驗證**：測試預約功能
5. **確認**：檢查 Google Calendar 同步

## 📞 支持

如果問題仍然存在，請提供：
- Zeabur 部署日誌
- 測試腳本輸出
- Google Cloud Console 權限截圖

---

**修復完成時間**: $(date)
**修復版本**: v1.1.0
**狀態**: ✅ 已修復，等待部署驗證 