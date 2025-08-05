// 載入環境變數配置
require('./env-config');

const { google } = require('googleapis');

async function testOAuthDirect() {
  console.log('🧪 直接 OAuth 2.0 測試開始...');
  
  try {
    // 直接使用 OAuth 2.0 憑證
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    console.log('📋 憑證檢查:');
    console.log('  - 用戶端 ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('  - 用戶端密鑰:', process.env.GOOGLE_CLIENT_SECRET ? '✅ 已設置' : '❌ 未設置');
    console.log('  - 重定向 URI:', process.env.GOOGLE_REDIRECT_URI);
    
    // 創建 Calendar API 客戶端
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    console.log('\n🧪 測試 1: 生成授權 URL...');
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent'
    });
    console.log('✅ 授權 URL 已生成');
    console.log('URL:', authUrl);
    
    console.log('\n📝 請您：');
    console.log('1. 在瀏覽器中打開授權 URL');
    console.log('2. 完成授權後，從 URL 中複製授權碼（code 參數）');
    console.log('3. 告訴我授權碼，我會繼續測試');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testOAuthDirect(); 