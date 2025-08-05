// 環境變數配置模板
// 請將此文件重命名為 env-config.js 並填入實際的憑證信息

const config = {
  // Google OAuth 2.0 配置
  GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID_HERE',
  GOOGLE_CLIENT_SECRET: 'YOUR_CLIENT_SECRET_HERE',
  GOOGLE_REDIRECT_URI: 'http://localhost:3050/auth/callback',
  
  // 服務器配置
  PORT: 3050,
  NODE_ENV: 'development'
};

// 設置環境變數
Object.keys(config).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = config[key];
  }
});

module.exports = config; 