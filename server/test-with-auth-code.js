const { google } = require('googleapis');
const fs = require('fs');

async function testWithAuthCode() {
  console.log('🧪 使用授權碼測試 OAuth 2.0...');
  
  try {
    // 讀取 OAuth 2.0 憑證文件
    const credentials = JSON.parse(fs.readFileSync('./oauth2-credentials.json', 'utf8'));
    
    // 創建 OAuth 2.0 客戶端
    const oauth2Client = new google.auth.OAuth2(
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0]
    );
    
    console.log('📝 請您：');
    console.log('1. 從重定向 URL 中複製授權碼（code 參數）');
    console.log('2. 告訴我授權碼，我會用它來測試讀取和寫入功能');
    console.log('3. 授權碼格式類似：4/0AfJohXn...');
    
    // 這裡需要您提供授權碼
    // 授權碼會從重定向 URL 中獲取
    // 例如：http://localhost:3050/auth/callback?code=4/0AfJohXn...
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 測試授權碼的函數
async function testAuthCode(authCode) {
  try {
    const credentials = JSON.parse(fs.readFileSync('./oauth2-credentials.json', 'utf8'));
    const oauth2Client = new google.auth.OAuth2(
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0]
    );
    
    console.log('🔄 使用授權碼獲取令牌...');
    const { tokens } = await oauth2Client.getToken(authCode);
    oauth2Client.setCredentials(tokens);
    
    console.log('✅ 令牌獲取成功');
    
    // 創建 Calendar API 客戶端
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    console.log('\n🧪 測試 1: 讀取日曆事件...');
    const today = new Date().toISOString().split('T')[0];
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: `${today}T00:00:00+08:00`,
      timeMax: `${today}T23:59:59+08:00`,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    console.log('✅ 讀取測試成功');
    console.log('  - 今日事件數量:', events.data.items.length);
    
    console.log('\n🧪 測試 2: 創建測試事件...');
    const testEvent = {
      summary: 'OAuth 2.0 測試預約',
      description: '這是一個 OAuth 2.0 測試預約',
      start: {
        dateTime: `${today}T17:00:00+08:00`,
        timeZone: 'Asia/Taipei',
      },
      end: {
        dateTime: `${today}T18:00:00+08:00`,
        timeZone: 'Asia/Taipei',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
        ],
      },
    };
    
    const createdEvent = await calendar.events.insert({
      calendarId: 'primary',
      resource: testEvent,
    });
    
    console.log('✅ 寫入測試成功');
    console.log('  - 事件 ID:', createdEvent.data.id);
    console.log('  - 事件標題:', createdEvent.data.summary);
    console.log('  - 事件鏈接:', createdEvent.data.htmlLink);
    
    console.log('\n🧪 測試 3: 清理測試事件...');
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: createdEvent.data.id
    });
    console.log('✅ 測試事件已清理');
    
    console.log('\n🎉 所有測試通過！OAuth 2.0 配置正確');
    console.log('✅ 讀取功能: 正常');
    console.log('✅ 寫入功能: 正常');
    console.log('✅ 刪除功能: 正常');
    
    // 保存令牌供後續使用
    fs.writeFileSync('./tokens.json', JSON.stringify(tokens, null, 2));
    console.log('✅ 令牌已保存到 tokens.json');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 如果提供了授權碼參數
if (process.argv[2]) {
  testAuthCode(process.argv[2]);
} else {
  testWithAuthCode();
} 