// 環境變數配置
// 請將此文件重命名為 .env 或直接在系統環境變數中設置

const config = {
  // Google OAuth 2.0 配置 - 從環境變數讀取
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'https://amaze-booking-system.zeabur.app/auth/callback',
  
  // 服務器配置
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'production'
};

// 驗證必要的環境變數
const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
const missingVars = requiredEnvVars.filter(key => !config[key]);

if (missingVars.length > 0) {
  console.error('❌ 缺少必要的環境變數:', missingVars.join(', '));
  console.error('請在 Zeabur 專案設定中配置這些環境變數');
  process.exit(1);
}

// 設置環境變數
Object.keys(config).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = config[key];
  }
});

module.exports = config; 