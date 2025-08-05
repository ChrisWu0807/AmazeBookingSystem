#!/bin/bash

echo "🚀 Amaze 預約系統部署和測試腳本"
echo "=================================="

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 請在項目根目錄運行此腳本"
    exit 1
fi

echo "📦 安裝依賴..."
npm install

echo "🔧 安裝服務器依賴..."
cd server && npm install && cd ..

echo "🧪 測試 Google Calendar 連接..."
cd server && node test-google-calendar.js && cd ..

echo "✅ 本地測試完成！"
echo ""
echo "🌐 部署到 Zeabur:"
echo "1. 提交更改: git add . && git commit -m '修復 Google Calendar 連接'"
echo "2. 推送到 GitHub: git push origin main"
echo "3. Zeabur 會自動部署"
echo ""
echo "📊 監控部署:"
echo "- 查看 Zeabur 日誌"
echo "- 測試預約功能"
echo "- 檢查 Google Calendar 同步" 