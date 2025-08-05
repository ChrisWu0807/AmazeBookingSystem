// 載入環境變數配置
require('./env-config');

const GoogleCalendarService = require('./googleCalendar-oauth');

async function testOAuth() {
  console.log('🧪 測試 OAuth 2.0 配置...');
  
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
      console.log('\n📝 下一步操作:');
      console.log('1. 在瀏覽器中打開授權 URL');
      console.log('2. 登入 Google 帳戶並授權');
      console.log('3. 完成授權後重新運行此測試');
    } else {
      console.log('\n🧪 測試日曆連接...');
      const today = new Date().toISOString().split('T')[0];
      const events = await calendarService.getEventsByDate(today);
      console.log('✅ 日曆連接成功');
      console.log('  - 今日事件數量:', events.length);
      console.log('  - 使用的日曆 ID:', calendarService.calendarId);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testOAuth(); 