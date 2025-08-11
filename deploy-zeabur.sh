#!/bin/bash

# 🚀 Zeabur 部署腳本
# 使用方法: ./deploy-zeabur.sh

echo "🚀 開始部署到 Zeabur..."

# 檢查是否有未提交的更改
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  發現未提交的更改，正在提交..."
    git add .
    git commit -m "Prepare for Zeabur deployment - $(date)"
fi

# 推送到遠端倉庫
echo "📤 推送到 Git 倉庫..."
git push origin main

echo "✅ 代碼已推送到 Git 倉庫"
echo ""
echo "📋 接下來需要在 Zeabur 中進行以下操作："
echo ""
echo "1. 🔗 連接到你的 Git 倉庫"
echo "2. ⚙️  設定環境變數："
echo "   - GOOGLE_CLIENT_ID=679955325298-b79n0f5f0l40ktckv2ql52jr3dg9q1ef.apps.googleusercontent.com"
echo "   - GOOGLE_CLIENT_SECRET=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"
echo "   - GOOGLE_REDIRECT_URI=https://amaze-booking-system.zeabur.app/auth/callback"
echo "   - NODE_ENV=production"
echo "   - PORT=8080"
echo ""
echo "3. 🚀 部署專案"
echo "4. 🔐 完成首次 OAuth 授權"
echo ""
echo "📖 詳細說明請參考 ZEABUR_DEPLOYMENT.md"
echo ""
echo "🎉 部署完成！" 