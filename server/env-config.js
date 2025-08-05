// 環境變數配置
// 請將此文件重命名為 .env 或直接在系統環境變數中設置

const config = {
  // Google OAuth 2.0 配置
  GOOGLE_CLIENT_ID: '679955325298-b79n0f5f0l40ktckv2ql52jr3dg9q1ef.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: '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',
  GOOGLE_REDIRECT_URI: 'https://amaze-booking-system.zeabur.app/auth/callback',
  
  // 服務器配置
  PORT: 3050,
  NODE_ENV: 'production'
};

// 設置環境變數
Object.keys(config).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = config[key];
  }
});

module.exports = config; 