const fs = require('fs');
const { google } = require('googleapis');

async function diagnoseCredentials() {
  console.log('🔍 開始診斷 Google Calendar 憑證...');
  
  try {
    // 1. 檢查憑證文件
    console.log('\n📄 檢查憑證文件...');
    const keyFile = './service-account-key.json';
    
    if (!fs.existsSync(keyFile)) {
      console.error('❌ 憑證文件不存在');
      return;
    }
    
    const keyData = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    console.log('✅ 憑證文件存在且格式正確');
    console.log('📊 憑證信息:');
    console.log('  - 項目 ID:', keyData.project_id);
    console.log('  - 客戶郵箱:', keyData.client_email);
    console.log('  - 私鑰 ID:', keyData.private_key_id);
    console.log('  - 私鑰長度:', keyData.private_key.length);
    
    // 2. 檢查私鑰格式
    console.log('\n🔐 檢查私鑰格式...');
    const privateKey = keyData.private_key;
    
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('❌ 私鑰格式錯誤：缺少 BEGIN 標記');
      return;
    }
    
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      console.error('❌ 私鑰格式錯誤：缺少 END 標記');
      return;
    }
    
    console.log('✅ 私鑰格式正確');
    
    // 3. 測試 Google Auth
    console.log('\n🔑 測試 Google Auth...');
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    try {
      const client = await auth.getClient();
      console.log('✅ Google Auth 客戶端創建成功');
      
      // 4. 測試獲取訪問令牌
      console.log('\n🎫 測試獲取訪問令牌...');
      const accessToken = await client.getAccessToken();
      console.log('✅ 成功獲取訪問令牌');
      console.log('  - 令牌長度:', accessToken.token.length);
      
      // 5. 測試 Calendar API
      console.log('\n📅 測試 Calendar API...');
      const calendar = google.calendar({ version: 'v3', auth: client });
      
      try {
        const response = await calendar.calendarList.list();
        console.log('✅ Calendar API 連接成功');
        console.log('  - 可用日曆數量:', response.data.items.length);
        
        // 列出所有日曆
        response.data.items.forEach((cal, index) => {
          console.log(`  ${index + 1}. ${cal.summary} (${cal.id})`);
        });
        
      } catch (calendarError) {
        console.error('❌ Calendar API 連接失敗:', calendarError.message);
        
        if (calendarError.code === 403) {
          console.log('💡 建議：檢查 Google Calendar API 是否已啟用');
        }
      }
      
    } catch (authError) {
      console.error('❌ Google Auth 失敗:', authError.message);
      
      if (authError.message.includes('Invalid JWT Signature')) {
        console.log('💡 可能的原因：');
        console.log('  1. 私鑰內容損壞或格式錯誤');
        console.log('  2. 服務帳戶權限不足');
        console.log('  3. 項目 ID 不匹配');
        console.log('  4. 需要重新生成服務帳戶密鑰');
      }
    }
    
  } catch (error) {
    console.error('❌ 診斷過程中發生錯誤:', error.message);
  }
}

diagnoseCredentials(); 