const { google } = require('googleapis');

async function testServiceAccount() {
  console.log('🧪 測試新的服務帳戶憑證...');
  
  try {
    // 使用新的服務帳戶憑證
    const auth = new google.auth.GoogleAuth({
      keyFile: './booking-system-468006-e111664239b2.json',
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    const client = await auth.getClient();
    console.log('✅ 認證成功');
    
    const calendar = google.calendar({ version: 'v3', auth: client });
    
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
      summary: '服務帳戶測試預約',
      description: '這是一個服務帳戶測試預約',
      start: {
        dateTime: `${today}T16:00:00+08:00`,
        timeZone: 'Asia/Taipei',
      },
      end: {
        dateTime: `${today}T17:00:00+08:00`,
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
    
    console.log('\n🧪 測試 3: 清理測試事件...');
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: createdEvent.data.id
    });
    console.log('✅ 測試事件已清理');
    
    console.log('\n🎉 所有測試通過！服務帳戶憑證正常');
    console.log('✅ 讀取功能: 正常');
    console.log('✅ 寫入功能: 正常');
    console.log('✅ 刪除功能: 正常');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('詳細錯誤:', error);
  }
}

testServiceAccount(); 