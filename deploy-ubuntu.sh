#!/bin/bash

# Amaze 預約系統 - Ubuntu 伺服器部署腳本
# 伺服器：your-server-ip

echo "🚀 開始部署 Amaze 預約系統到 Ubuntu 伺服器..."

# 1. 更新系統
echo "📦 更新系統套件..."
sudo apt update && sudo apt upgrade -y

# 2. 安裝 Node.js 和 npm
echo "📦 安裝 Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安裝 PM2 進程管理器
echo "📦 安裝 PM2..."
sudo npm install -g pm2

# 4. 安裝 Nginx
echo "📦 安裝 Nginx..."
sudo apt install nginx -y

# 5. 創建應用程式目錄
echo "📁 創建應用程式目錄..."
sudo mkdir -p /var/www/amaze-booking
sudo chown $USER:$USER /var/www/amaze-booking

# 6. 複製專案檔案
echo "📁 複製專案檔案..."
cp -r * /var/www/amaze-booking/

# 7. 安裝依賴
echo "📦 安裝依賴..."
cd /var/www/amaze-booking
npm install
cd server && npm install
cd ..

# 8. 設置環境變數
echo "🔧 設置環境變數..."
cat > /var/www/amaze-booking/server/.env << EOF
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
PORT=3050
NODE_ENV=production
EOF

# 9. 建置前端
echo "🔨 建置前端..."
cd client
npm run build
cd ..

# 10. 配置 Nginx
echo "🔧 配置 Nginx..."
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

# 11. 啟用 Nginx 配置
echo "🔧 啟用 Nginx 配置..."
sudo ln -sf /etc/nginx/sites-available/amaze-booking /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 12. 啟動應用程式
echo "🚀 啟動應用程式..."
cd /var/www/amaze-booking/server
pm2 start index-oauth.js --name "amaze-booking"
pm2 save
pm2 startup

echo "✅ 部署完成！"
echo "🌐 訪問地址：http://your-domain.com"
echo "📱 前端：http://your-domain.com"
echo "🔧 API：http://your-domain.com/api"
echo "🔐 OAuth：http://your-domain.com/auth/google/callback" 