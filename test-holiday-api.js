const axios = require('axios');

async function testHolidayAPI() {
  try {
    console.log('🧪 測試假日API...');
    
    // 測試今天的日期
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 測試日期: ${today}`);
    
    const response = await axios.get(`http://localhost:3050/api/reservations/date/${today}`);
    
    console.log('✅ API響應:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.holiday) {
      console.log('🎉 發現假日設置!');
      console.log(`假日名稱: ${response.data.holiday.description}`);
      console.log(`限制時段: ${response.data.holiday.time_slots.join(', ')}`);
    } else {
      console.log('📝 沒有發現假日設置');
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.response?.data || error.message);
  }
}

testHolidayAPI(); 