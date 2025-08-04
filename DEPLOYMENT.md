# 🚀 Amaze 預約系統 - 部署指南

## 📋 部署選項

### 1. Vercel 部署（推薦）
- 自動部署
- 免費 SSL 證書
- 全球 CDN
- 自動環境變數管理

### 2. Zeabur 部署
- 支援自動抓取
- 簡單配置
- 免費方案

### 3. Ubuntu 伺服器部署
- 完全控制
- 自定義域名
- 需要手動管理

## 🎯 Vercel 部署步驟

### 第一步：準備 GitHub 倉庫
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 第二步：連接 Vercel
1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊 "New Project"
3. 選擇您的 GitHub 倉庫
4. 配置環境變數

### 第三步：設置環境變數
在 Vercel Dashboard 中添加以下環境變數：

```
GOOGLE_CLIENT_ID=679955325298-4nnvpip7s9elbk5qucjr5a5sn0oosu37.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://your-vercel-url.vercel.app/auth/google/callback
NODE_ENV=production
```

### 第四步：更新 Google OAuth 設定
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 找到您的 OAuth 2.0 憑證
3. 添加授權的重定向 URI：
   - `https://your-vercel-url.vercel.app/auth/google/callback`

## 🎯 Zeabur 部署步驟

### 第一步：準備配置
專案已包含 `zeabur.toml` 配置文件，支援自動部署。

### 第二步：連接 Zeabur
1. 前往 [Zeabur Dashboard](https://zeabur.com/)
2. 點擊 "New Service"
3. 選擇 "GitHub" 並選擇您的倉庫
4. Zeabur 會自動檢測配置並部署

### 第三步：設置環境變數
在 Zeabur Dashboard 中添加環境變數：

```
GOOGLE_CLIENT_ID=679955325298-4nnvpip7s9elbk5qucjr5a5sn0oosu37.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://your-zeabur-url.zeabur.app/auth/google/callback
NODE_ENV=production
```

## 🎯 Ubuntu 伺服器部署

### 第一步：連接伺服器
```bash
ssh root@your-server-ip
# 輸入您的伺服器密碼
```

### 第二步：安裝必要軟體
```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安裝 PM2 進程管理器
sudo npm install -g pm2

# 安裝 Nginx
sudo apt install nginx -y

# 安裝 Git
sudo apt install git -y
```

### 第三步：下載專案
```bash
# 創建應用程式目錄
sudo mkdir -p /var/www/amaze-booking
sudo chown $USER:$USER /var/www/amaze-booking

# 下載專案
cd /var/www/amaze-booking
git clone https://github.com/ChrisWu0807/AmazeBookingSystem.git .
```

### 第四步：設置環境變數
```bash
# 創建環境變數檔案
cat > /var/www/amaze-booking/server/.env << EOF
GOOGLE_CLIENT_ID=679955325298-4nnvpip7s9elbk5qucjr5a5sn0oosu37.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
PORT=3050
NODE_ENV=production
EOF
```

### 第五步：安裝依賴並建置
```bash
# 安裝根目錄依賴
npm install

# 安裝後端依賴
cd server && npm install

# 安裝前端依賴
cd ../client && npm install

# 建置前端
npm run build

cd /var/www/amaze-booking
```

### 第六步：配置 Nginx
```bash
# 創建 Nginx 配置
sudo tee /etc/nginx/sites-available/amaze-booking << EOF
server {
    listen 80;
    server_name your-domain.com;

    # 前端靜態檔案
    location / {
        root /var/www/amaze-booking/client/build;
        try_files \$uri \$uri/ /index.html;
    }

    # API 代理到後端
    location /api/ {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # OAuth 回調
    location /auth/ {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 啟用配置
sudo ln -sf /etc/nginx/sites-available/amaze-booking /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 測試配置
sudo nginx -t

# 重啟 Nginx
sudo systemctl restart nginx
```

### 第七步：啟動應用程式
```bash
# 啟動後端
cd /var/www/amaze-booking/server
pm2 start index-oauth.js --name "amaze-booking"

# 保存 PM2 配置
pm2 save

# 設置開機自啟
pm2 startup
```

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

## 🚨 重要注意事項

### 1. Google OAuth 設定
- 每次部署後都需要更新 Google Cloud Console 的重定向 URI
- 確保域名和協議正確（http vs https）

### 2. 環境變數
- 不要在代碼中硬編碼敏感資訊
- 使用環境變數管理所有配置
- 定期更新憑證

### 3. 安全性
- 啟用 HTTPS
- 設置適當的 CORS 策略
- 定期更新依賴包

## 📞 故障排除

### 常見問題
1. **OAuth 認證失敗**
   - 檢查重定向 URI 是否正確
   - 確認環境變數已設置
   - 查看伺服器日誌

2. **API 連接失敗**
   - 檢查網路連接
   - 確認端口配置
   - 查看防火牆設定

3. **前端無法載入**
   - 檢查建置是否成功
   - 確認靜態檔案路徑
   - 查看瀏覽器控制台錯誤

### 日誌查看
```bash
# Vercel
vercel logs

# Zeabur
# 在 Dashboard 中查看日誌

# Ubuntu
pm2 logs amaze-booking
sudo tail -f /var/log/nginx/error.log
```

## ✅ 部署檢查清單

- [ ] 代碼已推送到 GitHub
- [ ] 環境變數已設置
- [ ] Google OAuth 重定向 URI 已更新
- [ ] 域名已配置（如適用）
- [ ] SSL 證書已安裝（如適用）
- [ ] 健康檢查通過
- [ ] 預約功能測試通過
- [ ] OAuth 認證測試通過

## 🎉 部署完成

部署完成後，您的 Amaze 預約系統將支援：
- ✅ 客戶預約表單
- ✅ Google Calendar 同步
- ✅ OAuth 2.0 認證
- ✅ 響應式設計
- ✅ 雲端部署
- ✅ 自動擴展 