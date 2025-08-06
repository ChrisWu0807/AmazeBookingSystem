# 假日日曆系統配置

## 系統架構

### 日曆配置
- **主日曆（預約）**: `c_1e63bb3f36499d33d3bcf134b0b2eb69796a045fc5dcc2b548d8983250f369b4@group.calendar.google.com`
- **假日日曆**: `c_bef9794df3c8b577443f97fff8834e6225e0cd13bf95aa32e4e37901a6602303@group.calendar.google.com`

### 功能邏輯

#### 1. 預約創建
- 所有客戶預約都創建到主日曆
- 創建前會檢查假日日曆中的衝突
- 如果時段與假日衝突，拒絕預約

#### 2. 假日管理
- 管理員在管理後台創建假日
- 假日事件創建到假日日曆
- 支持全天假日和部分時段限制

#### 3. 客戶端顯示
- 客戶端獲取該日期的所有事件（主日曆）
- 同時獲取假日信息（假日日曆）
- 根據假日信息過濾可用時段
- 衝突時段顯示為不可預約

## 技術實現

### 後端API

#### 預約創建檢查
```javascript
// 檢查是否為假日（從假日日曆）
const isHolidayConflict = await calendarService.checkHolidayConflict(date, time);
if (isHolidayConflict) {
  return res.status(400).json({
    success: false,
    message: '該時段為假日，暫停預約'
  });
}
```

#### 獲取日期事件
```javascript
// 獲取主日曆事件（預約）
const dayReservations = await calendarService.getEventsByDate(date);
// 獲取假日日曆事件
const holidayEvents = await calendarService.getHolidayEventsByDate(date);
```

#### 假日創建
```javascript
// 創建到假日日曆
const createdEvent = await calendarService.createEvent(holidayData, calendarService.holidayCalendarId);
```

### 客戶端邏輯

#### 時段過濾
```javascript
// 如果有假日限制時段，進一步過濾
if (holidayData && holidayData.time_slots && holidayData.time_slots.length > 0) {
  available = available.filter(slot => !holidayData.time_slots.includes(slot));
}
```

#### 完全休息日處理
```javascript
if (holidayData) {
  const restrictedSlots = holidayData.time_slots || [];
  if (restrictedSlots.length === 0) {
    // 如果沒有指定限制時段，表示整個日期都休息
    setAvailableSlots([]);
    setBookedSlots({});
    return;
  }
}
```

## 假日類型

### 1. 全天假日
- 創建全天事件（date格式）
- 客戶端顯示該日期無法預約

### 2. 部分時段限制
- 創建特定時段事件（dateTime格式）
- 客戶端只隱藏衝突時段
- 其他時段仍可預約

## 管理員操作

### 創建假日
1. 登入管理員後台
2. 選擇"假日管理"
3. 填寫日期範圍和描述
4. 可選：設置限制時段
5. 系統自動創建到假日日曆

### 刪除假日
1. 在假日管理頁面查看現有假日
2. 點擊刪除按鈕
3. 系統從假日日曆中刪除事件

## 部署注意事項

1. **OAuth權限**: 確保Google Calendar API有權限訪問兩個日曆
2. **日曆ID**: 確認日曆ID正確且可訪問
3. **錯誤處理**: 如果無法訪問假日日曆，系統會允許預約（安全模式）

## 測試建議

1. **創建測試假日**: 在管理後台創建一個測試假日
2. **驗證客戶端**: 檢查客戶端是否正確隱藏衝突時段
3. **測試預約**: 嘗試預約衝突時段，確認被拒絕
4. **檢查日曆**: 確認事件創建在正確的日曆中 