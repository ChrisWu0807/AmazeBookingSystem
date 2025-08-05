const { google } = require('googleapis');
const fs = require('fs');

async function testNewOAuth2() {
  console.log('🧪 測試新的 OAuth 2.0 憑證...');
  
  try {
    // 讀取新的 OAuth 2.0 憑證文件
    const credentials = JSON.parse(fs.readFileSync('./oauth2-credentials.json', 'utf8'));
    
    console.log('📋 憑證檢查:');
    console.log('  - 用戶端 ID:', credentials.web.client_id);
    console.log('  - 項目 ID:', credentials.web.project_id);
    console.log('  - 重定向 URI:', credentials.web.redirect_uris[0]);
    
    // 創建 OAuth 2.0 客戶端
    const oauth2Client = new google.auth.OAuth2(
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0]
    );
    
    console.log('\n🔗 生成授權 URL...');
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
    console.log('2. 完成授權後，從重定向 URL 中複製授權碼（code 參數）');
    console.log('3. 告訴我授權碼，我會用它來測試讀取和寫入功能');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testNewOAuth2(); 