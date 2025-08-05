const express = require('express');
const router = express.Router();
const GoogleCalendarService = require('./googleCalendar-oauth');
const moment = require('moment');

// 管理員認證中間件
const authenticateAdmin = (req, res, next) => {
  const adminToken = req.headers['admin-token'];
  
  // 簡單的管理員token驗證（生產環境應該使用更安全的方式）
  if (adminToken === process.env.ADMIN_TOKEN || adminToken === 'amaze-admin-2024') {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: '管理員認證失敗'
    });
  }
};

// 所有管理員路由都需要認證
router.use(authenticateAdmin);

// 1. 獲取所有預約（從Google Calendar）
router.get('/reservations', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date } = req.query;
    
    const calendarService = new GoogleCalendarService();
    
    // 獲取未來30天的所有事件
    const startDate = moment().format('YYYY-MM-DD');
    const endDate = moment().add(30, 'days').format('YYYY-MM-DD');
    
    const events = await calendarService.getEventsByDateRange(startDate, endDate);
    
    // 過濾出預約事件（標題包含"客戶預約"）
    const reservations = events
      .filter(event => event.summary && event.summary.includes('客戶預約'))
      .map(event => {
        const startTime = new Date(event.start.dateTime || event.start.date);
        const endTime = new Date(event.end.dateTime || event.end.date);
        
        // 從描述中提取客戶信息
        const description = event.description || '';
        const nameMatch = description.match(/姓名[：:]\s*([^\n]+)/);
        const phoneMatch = description.match(/電話[：:]\s*([^\n]+)/);
        const noteMatch = description.match(/備註[：:]\s*([^\n]+)/);
        
        return {
          id: event.id,
          name: nameMatch ? nameMatch[1].trim() : '未知',
          phone: phoneMatch ? phoneMatch[1].trim() : '未知',
          date: startTime.toISOString().split('T')[0],
          time: startTime.toTimeString().slice(0, 5),
          note: noteMatch ? noteMatch[1].trim() : '',
          check_status: '已確認', // Google Calendar中的預約都視為已確認
          created_at: startTime.toISOString(),
          google_event_id: event.id
        };
      });
    
    // 應用篩選
    let filteredReservations = reservations;
    
    if (status) {
      filteredReservations = filteredReservations.filter(r => r.check_status === status);
    }
    
    if (date) {
      filteredReservations = filteredReservations.filter(r => r.date === date);
    }
    
    // 應用分頁
    const total = filteredReservations.length;
    const offset = (page - 1) * limit;
    const paginatedReservations = filteredReservations.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        reservations: paginatedReservations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('獲取預約列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取預約列表失敗',
      error: error.message
    });
  }
});

// 2. 更新預約狀態（刪除並重新創建事件）
router.put('/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['未確認', '已確認', '已取消'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '無效的狀態值'
      });
    }
    
    const calendarService = new GoogleCalendarService();
    
    if (status === '已取消') {
      // 刪除事件
      await calendarService.deleteEvent(id);
      res.json({
        success: true,
        message: '預約已取消'
      });
    } else {
      // 對於其他狀態，我們保持事件不變（因為Google Calendar中都是已確認的）
      res.json({
        success: true,
        message: '預約狀態更新成功'
      });
    }
  } catch (error) {
    console.error('更新預約狀態失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新預約狀態失敗',
      error: error.message
    });
  }
});

// 3. 刪除預約
router.delete('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const calendarService = new GoogleCalendarService();
    await calendarService.deleteEvent(id);
    
    res.json({
      success: true,
      message: '預約刪除成功'
    });
  } catch (error) {
    console.error('刪除預約失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除預約失敗',
      error: error.message
    });
  }
});

// 4. 獲取時段統計
router.get('/time-slots/stats', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: '請提供日期參數'
      });
    }
    
    const calendarService = new GoogleCalendarService();
    const events = await calendarService.getEventsByDate(date);
    
    // 統計每個時段的預約數量
    const slotStats = {};
    const timeSlots = [
      '10:00', '10:30', '11:00', '11:30', '12:00', 
      '14:00', '14:30', '15:00', '15:30', 
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', 
      '19:00', '19:30'
    ];
    
    timeSlots.forEach(slot => {
      slotStats[slot] = {
        time: slot,
        count: 0,
        confirmed_count: 0,
        pending_count: 0,
        cancelled_count: 0
      };
    });
    
    events.forEach(event => {
      if (event.summary && event.summary.includes('客戶預約')) {
        const startTime = new Date(event.start.dateTime || event.start.date);
        const timeSlot = startTime.toTimeString().slice(0, 5);
        
        if (slotStats[timeSlot]) {
          slotStats[timeSlot].count++;
          slotStats[timeSlot].confirmed_count++; // Google Calendar中的都是已確認
        }
      }
    });
    
    res.json({
      success: true,
      data: Object.values(slotStats)
    });
  } catch (error) {
    console.error('獲取時段統計失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取時段統計失敗',
      error: error.message
    });
  }
});

// 5. 獲取假日設置（從Google Calendar）
router.get('/holidays', async (req, res) => {
  try {
    const calendarService = new GoogleCalendarService();
    
    // 獲取未來30天的假日事件
    const startDate = moment().format('YYYY-MM-DD');
    const endDate = moment().add(30, 'days').format('YYYY-MM-DD');
    
    const events = await calendarService.getEventsByDateRange(startDate, endDate);
    
    // 過濾出假日事件（標題包含"假日"、"休息"、"暫停"等關鍵字）
    const holidays = events.filter(event => {
      const title = event.summary?.toLowerCase() || '';
      const keywords = ['假日', '休息', '暫停', 'holiday', 'closed', 'break'];
      return keywords.some(keyword => title.includes(keyword));
    }).map(event => ({
      id: event.id,
      date: moment(event.start.dateTime || event.start.date).format('YYYY-MM-DD'),
      description: event.summary,
      time_slots: event.description ? JSON.parse(event.description) : [],
      start: event.start,
      end: event.end
    }));
    
    res.json({
      success: true,
      data: holidays
    });
  } catch (error) {
    console.error('獲取假日設置失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取假日設置失敗',
      error: error.message
    });
  }
});

// 6. 新增假日（創建Google Calendar事件）
router.post('/holidays', async (req, res) => {
  try {
    const { date, description, time_slots = [] } = req.body;
    
    if (!date || !description) {
      return res.status(400).json({
        success: false,
        message: '請提供日期和描述'
      });
    }
    
    const calendarService = new GoogleCalendarService();
    
    // 創建假日數據對象（符合createEvent方法期望的格式）
    const holidayData = {
      date: date,
      summary: description,
      description: JSON.stringify(time_slots) // 將限制時段存儲在描述中
      // 沒有time字段，會被識別為假日事件
    };
    
    const createdEvent = await calendarService.createEvent(holidayData);
    
    res.json({
      success: true,
      message: '假日設置成功',
      data: {
        id: createdEvent.id,
        date,
        description,
        time_slots
      }
    });
  } catch (error) {
    console.error('新增假日失敗:', error);
    res.status(500).json({
      success: false,
      message: '新增假日失敗',
      error: error.message
    });
  }
});

// 7. 刪除假日（刪除Google Calendar事件）
router.delete('/holidays/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const calendarService = new GoogleCalendarService();
    await calendarService.deleteEvent(eventId);
    
    res.json({
      success: true,
      message: '假日刪除成功'
    });
  } catch (error) {
    console.error('刪除假日失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除假日失敗',
      error: error.message
    });
  }
});

// 8. 獲取系統統計
router.get('/stats', async (req, res) => {
  try {
    const calendarService = new GoogleCalendarService();
    
    // 獲取今日和本週的事件
    const today = moment().format('YYYY-MM-DD');
    const weekStart = moment().startOf('week').format('YYYY-MM-DD');
    const weekEnd = moment().endOf('week').format('YYYY-MM-DD');
    
    const todayEvents = await calendarService.getEventsByDate(today);
    const weekEvents = await calendarService.getEventsByDateRange(weekStart, weekEnd);
    
    // 過濾出預約事件
    const todayReservations = todayEvents.filter(event => 
      event.summary && event.summary.includes('客戶預約')
    );
    
    const weekReservations = weekEvents.filter(event => 
      event.summary && event.summary.includes('客戶預約')
    );
    
    // 統計數據
    const todayStats = {
      total: todayReservations.length,
      confirmed: todayReservations.length,
      pending: 0,
      cancelled: 0
    };
    
    const weekStats = {
      total: weekReservations.length
    };
    
    // 總預約數（過去30天）
    const thirtyDaysAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const allEvents = await calendarService.getEventsByDateRange(thirtyDaysAgo, moment().add(30, 'days').format('YYYY-MM-DD'));
    const allReservations = allEvents.filter(event => 
      event.summary && event.summary.includes('客戶預約')
    );
    
    const totalStats = {
      total: allReservations.length
    };
    
    res.json({
      success: true,
      data: {
        today: todayStats,
        week: weekStats,
        total: totalStats
      }
    });
  } catch (error) {
    console.error('獲取系統統計失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取系統統計失敗',
      error: error.message
    });
  }
});

module.exports = router; 