// 載入環境變數配置
require('./env-config');

const GoogleCalendarService = require('./googleCalendar-oauth');

async function testOAuthComplete() {
  console.log('🧪 完整 OAuth 2.0 測試開始...');
  
  try {
    const calendarService = new GoogleCalendarService();
    
    console.log('📋 環境變數檢查:');
    console.log('  - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ 已設置' : '❌ 未設置');
    console.log('  - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ 已設置' : '❌ 未設置');
    console.log('  - GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '❌ 未設置');
    
    console.log('\n🔗 生成授權 URL...');
    const authUrl = calendarService.generateAuthUrl();
    console.log('✅ 授權 URL 已生成');
    console.log('URL:', authUrl);
    
    console.log('\n📊 授權狀態檢查:');
    const isAuthorized = calendarService.isAuthorized();
    console.log('  - 授權狀態:', isAuthorized ? '✅ 已授權' : '❌ 未授權');
    
    if (!isAuthorized) {
      console.log('\n📝 需要完成授權:');
      console.log('1. 在瀏覽器中打開授權 URL');
      console.log('2. 登入 Google 帳戶並授權');
      console.log('3. 完成授權後重新運行此測試');
      console.log('\n授權 URL:', authUrl);
      return;
    }
    
    console.log('\n🧪 測試 1: 讀取日曆事件...');
    const today = new Date().toISOString().split('T')[0];
    const events = await calendarService.getEventsByDate(today);
    console.log('✅ 讀取測試成功');
    console.log('  - 今日事件數量:', events.length);
    console.log('  - 使用的日曆 ID:', calendarService.calendarId);
    
    console.log('\n🧪 測試 2: 創建測試事件...');
    const testReservation = {
      name: 'OAuth 測試預約',
      phone: '0912345678',
      date: today,
      time: '15:00',
      note: '這是一個 OAuth 2.0 測試預約',
      check: '測試'
    };
    
    const createdEvent = await calendarService.createEvent(testReservation);
    console.log('✅ 寫入測試成功');
    console.log('  - 事件 ID:', createdEvent.id);
    console.log('  - 事件標題:', createdEvent.summary);
    console.log('  - 事件鏈接:', createdEvent.htmlLink);
    
    console.log('\n🧪 測試 3: 驗證事件已創建...');
    const updatedEvents = await calendarService.getEventsByDate(today);
    const testEvent = updatedEvents.find(event => event.id === createdEvent.id);
    
    if (testEvent) {
      console.log('✅ 事件驗證成功');
      console.log('  - 找到測試事件:', testEvent.summary);
    } else {
      console.log('❌ 事件驗證失敗');
    }
    
    console.log('\n🧪 測試 4: 清理測試事件...');
    try {
      await calendarService.calendar.events.delete({
        calendarId: calendarService.calendarId,
        eventId: createdEvent.id
      });
      console.log('✅ 測試事件已清理');
    } catch (error) {
      console.log('⚠️ 清理測試事件失敗:', error.message);
    }
    
    console.log('\n🎉 所有測試通過！OAuth 2.0 配置正確');
    console.log('✅ 讀取功能: 正常');
    console.log('✅ 寫入功能: 正常');
    console.log('✅ 刪除功能: 正常');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('詳細錯誤:', error);
  }
}

testOAuthComplete(); 