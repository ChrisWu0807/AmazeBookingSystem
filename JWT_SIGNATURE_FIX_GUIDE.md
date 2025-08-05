# 🔧 JWT 簽名錯誤解決方案指南

## 🚨 當前問題
```
❌ Google Calendar 同步失敗: GaxiosError: invalid_grant: Invalid JWT Signature.
```

## 🔍 問題分析
JWT 簽名錯誤通常由以下原因造成：
1. **服務帳戶密鑰損壞**：私鑰內容在複製過程中損壞
2. **權限不足**：服務帳戶沒有 Google Calendar API 權限
3. **項目配置錯誤**：項目 ID 或服務帳戶配置不正確

## ✅ 解決方案

### 方案 1：重新生成服務帳戶密鑰（推薦）

#### 步驟 1：前往 Google Cloud Console
1. 打開 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇項目：`booking-system-468006`
3. 導航到：**IAM 與管理** > **服務帳戶**

#### 步驟 2：找到服務帳戶
- 服務帳戶名稱：`amaze-booking-calendar@booking-system-468006.iam.gserviceaccount.com`
- 點擊該服務帳戶

#### 步驟 3：重新生成密鑰
1. 點擊 **金鑰** 標籤
2. 點擊 **新增金鑰** > **建立新的金鑰**
3. 選擇 **JSON** 格式
4. 下載新的密鑰文件

#### 步驟 4：替換憑證文件
1. 將新下載的 JSON 文件重命名為 `service-account-key.json`
2. 替換 `server/service-account-key.json` 文件
3. 確保文件權限正確（644）

### 方案 2：檢查 Google Calendar API 權限

#### 步驟 1：啟用 Google Calendar API
1. 在 Google Cloud Console 中
2. 導航到：**API 與服務** > **程式庫**
3. 搜索 "Google Calendar API"
4. 點擊並啟用

#### 步驟 2：檢查服務帳戶權限
1. 導航到：**IAM 與管理** > **IAM**
2. 找到服務帳戶：`amaze-booking-calendar@booking-system-468006.iam.gserviceaccount.com`
3. 確保有以下角色：
   - **Calendar API 管理員**
   - **服務帳戶使用者**

### 方案 3：使用環境變數（部署環境）

#### 步驟 1：將憑證內容轉為環境變數
```bash
# 將憑證內容轉為 base64
base64 -i service-account-key.json
```

#### 步驟 2：在 Zeabur 中設置環境變數
1. 前往 Zeabur 項目設置
2. 添加環境變數：`GOOGLE_APPLICATION_CREDENTIALS_JSON`
3. 值為 base64 編碼的憑證內容

#### 步驟 3：修改代碼以使用環境變數
```javascript
// 在 googleCalendar.js 中
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
  scopes: ['https://www.googleapis.com/auth/calendar']
});
```

## 🧪 測試步驟

### 本地測試
```bash
# 1. 替換憑證文件後
cd server
node test-google-calendar.js

# 2. 應該看到：
# ✅ 使用指定日曆: [日曆名稱]
# ✅ 成功獲取事件: X 個
# ✅ 成功創建測試事件: [事件ID]
# 🎉 所有測試通過！
```

### 部署測試
```bash
# 1. 提交更改
git add .
git commit -m "修復 JWT 簽名錯誤 - 更新服務帳戶憑證"
git push origin main

# 2. 監控 Zeabur 部署
# 查看日誌確認沒有錯誤
```

## 📋 檢查清單

### 修復前檢查
- [ ] 服務帳戶密鑰是否完整且未損壞
- [ ] Google Calendar API 是否已啟用
- [ ] 服務帳戶是否有正確權限
- [ ] 項目 ID 是否正確

### 修復後檢查
- [ ] 本地測試是否通過
- [ ] 部署是否成功
- [ ] 預約功能是否正常
- [ ] Google Calendar 同步是否正常

## 🚨 緊急解決方案

如果上述方案都不行，可以嘗試：

### 方案 A：使用 OAuth 2.0 而不是服務帳戶
1. 設置 OAuth 2.0 憑證
2. 使用用戶授權流程
3. 需要用戶手動授權

### 方案 B：使用 API 密鑰（僅讀取）
1. 創建 API 密鑰
2. 僅用於讀取日曆事件
3. 寫入操作需要其他方法

## 📞 支持信息

### 需要提供的資料
- Google Cloud Console 截圖
- 服務帳戶權限截圖
- 錯誤日誌完整信息

### 聯繫方式
- 項目 ID：`booking-system-468006`
- 服務帳戶：`amaze-booking-calendar@booking-system-468006.iam.gserviceaccount.com`
- 日曆 ID：`c_1e63bb3f36499d33d3bcf134b0b2eb69796a045fc5dcc2b548d8983250f369b4@group.calendar.google.com`

---

**最後更新**：$(date)
**狀態**：等待憑證修復
**優先級**：高 