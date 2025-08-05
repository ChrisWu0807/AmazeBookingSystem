const GoogleCalendarService = require('./googleCalendar');

async function testGoogleCalendar() {
  console.log('🧪 開始測試 Google Calendar 連接...');
  
  try {
    const calendarService = new GoogleCalendarService();
    
    // 等待初始化完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📅 測試獲取今日事件...');
    const today = new Date().toISOString().split('T')[0];
    const events = await calendarService.getEventsByDate(today);
    console.log('✅ 成功獲取事件:', events.length, '個');
    
    console.log('📝 測試創建測試事件...');
    const testReservation = {
      name: '測試預約',
      phone: '0912345678',
      date: today,
      time: '14:00',
      note: '這是一個測試預約',
      check: '測試'
    };
    
    const event = await calendarService.createEvent(testReservation);
    console.log('✅ 成功創建測試事件:', event.id);
    
    // 清理測試事件
    console.log('🧹 清理測試事件...');
    await calendarService.calendar.events.delete({
      calendarId: calendarService.calendarId,
      eventId: event.id
    });
    console.log('✅ 測試事件已清理');
    
    console.log('🎉 所有測試通過！');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('詳細錯誤:', error);
  }
}

testGoogleCalendar(); 