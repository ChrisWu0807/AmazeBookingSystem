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

// 5. 獲取假日設置（從假日日曆）
router.get('/holidays', async (req, res) => {
  try {
    const calendarService = new GoogleCalendarService();
    
    // 獲取未來30天的假日事件
    const startDate = moment().format('YYYY-MM-DD');
    const endDate = moment().add(30, 'days').format('YYYY-MM-DD');
    
    // 從假日日曆獲取事件
    const startOfRange = `${startDate}T00:00:00+08:00`;
    const endOfRange = `${endDate}T23:59:59+08:00`;
    
    const response = await calendarService.calendar.events.list({
      calendarId: calendarService.holidayCalendarId,
      timeMin: startOfRange,
      timeMax: endOfRange,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const events = response.data.items;
    
    // 處理假日事件
    const holidays = events.map(event => ({
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
    const { start_date, end_date, description, time_slots = [] } = req.body;
    
    if (!start_date || !description) {
      return res.status(400).json({
        success: false,
        message: '請提供開始日期和描述'
      });
    }
    
    const calendarService = new GoogleCalendarService();
    const endDate = end_date || start_date; // 如果沒有結束日期，使用開始日期
    
    // 生成日期範圍內的所有日期
    const start = moment(start_date);
    const end = moment(endDate);
    const dates = [];
    
    for (let date = start.clone(); date.isSameOrBefore(end); date.add(1, 'day')) {
      dates.push(date.format('YYYY-MM-DD'));
    }
    
    const createdEvents = [];
    
    // 為每個日期創建假日事件到假日日曆
    for (const date of dates) {
      if (time_slots.length === 0) {
        // 完全休息日 - 創建全天假日事件
        const holidayData = {
          date: date,
          summary: description,
          description: '' // 完全休息日
        };
        
        const createdEvent = await calendarService.createEvent(holidayData, calendarService.holidayCalendarId);
        createdEvents.push({
          id: createdEvent.id,
          date,
          description,
          time_slots: []
        });
      } else {
        // 部分時段限制 - 為每個限制時段創建單獨的事件
        for (const timeSlot of time_slots) {
          const holidayData = {
            date: date,
            time: timeSlot, // 設置具體時段
            summary: description,
            description: `限制時段：${timeSlot}`
          };
          
          const createdEvent = await calendarService.createEvent(holidayData, calendarService.holidayCalendarId);
          createdEvents.push({
            id: createdEvent.id,
            date,
            description,
            time_slots: [timeSlot]
          });
        }
      }
    }
    
    res.json({
      success: true,
      message: `假日設置成功，共創建 ${createdEvents.length} 個假日事件`,
      data: createdEvents
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

// 7. 刪除假日（刪除假日日曆事件）
router.delete('/holidays/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const calendarService = new GoogleCalendarService();
    await calendarService.deleteEvent(eventId, calendarService.holidayCalendarId);
    
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

// 9. 查詢預約（支持多種篩選條件）
router.get('/reservations/search', async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      date, 
      start_date, 
      end_date, 
      status,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const calendarService = new GoogleCalendarService();
    
    // 確定日期範圍
    let startDate, endDate;
    if (date) {
      startDate = date;
      endDate = date;
    } else if (start_date && end_date) {
      startDate = start_date;
      endDate = end_date;
    } else {
      startDate = moment().format('YYYY-MM-DD');
      endDate = moment().add(30, 'days').format('YYYY-MM-DD');
    }
    
    const events = await calendarService.getEventsByDateRange(startDate, endDate);
    
    // 過濾出預約事件
    let reservations = events
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
          check_status: '已確認',
          created_at: startTime.toISOString(),
          google_event_id: event.id
        };
      });
    
    // 應用篩選條件
    if (name) {
      reservations = reservations.filter(r => 
        r.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    
    if (phone) {
      reservations = reservations.filter(r => 
        r.phone.includes(phone)
      );
    }
    
    if (status) {
      reservations = reservations.filter(r => r.check_status === status);
    }
    
    // 按日期和時間排序
    reservations.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
    
    // 應用分頁
    const total = reservations.length;
    const offset = (page - 1) * limit;
    const paginatedReservations = reservations.slice(offset, offset + parseInt(limit));
    
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
    console.error('查詢預約失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢預約失敗',
      error: error.message
    });
  }
});

// 10. 獲取單個預約詳情
router.get('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const calendarService = new GoogleCalendarService();
    const event = await calendarService.getEvent(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: '預約不存在'
      });
    }
    
    if (!event.summary || !event.summary.includes('客戶預約')) {
      return res.status(404).json({
        success: false,
        message: '該事件不是客戶預約'
      });
    }
    
    const startTime = new Date(event.start.dateTime || event.start.date);
    const endTime = new Date(event.end.dateTime || event.end.date);
    
    // 從描述中提取客戶信息
    const description = event.description || '';
    const nameMatch = description.match(/姓名[：:]\s*([^\n]+)/);
    const phoneMatch = description.match(/電話[：:]\s*([^\n]+)/);
    const noteMatch = description.match(/備註[：:]\s*([^\n]+)/);
    
    const reservation = {
      id: event.id,
      name: nameMatch ? nameMatch[1].trim() : '未知',
      phone: phoneMatch ? phoneMatch[1].trim() : '未知',
      date: startTime.toISOString().split('T')[0],
      time: startTime.toTimeString().slice(0, 5),
      note: noteMatch ? noteMatch[1].trim() : '',
      check_status: '已確認',
      created_at: startTime.toISOString(),
      google_event_id: event.id
    };
    
    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    console.error('獲取預約詳情失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取預約詳情失敗',
      error: error.message
    });
  }
});

// 11. 修改預約（刪除原事件並創建新事件）
router.put('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, date, time, note } = req.body;
    
    // 驗證必填欄位
    if (!name || !phone || !date || !time) {
      return res.status(400).json({
        success: false,
        message: '缺少必填欄位：姓名、電話、日期、時段'
      });
    }
    
    // 驗證日期格式
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: '日期格式錯誤，請使用 YYYY-MM-DD 格式'
      });
    }
    
    // 驗證時間格式
    if (!moment(time, 'HH:mm', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: '時間格式錯誤，請使用 HH:mm 格式'
      });
    }
    
    const calendarService = new GoogleCalendarService();
    
    // 獲取原事件
    const originalEvent = await calendarService.getEvent(id);
    if (!originalEvent) {
      return res.status(404).json({
        success: false,
        message: '預約不存在'
      });
    }
    
    // 刪除原事件
    await calendarService.deleteEvent(id);
    
    // 創建新事件
    const newEventData = {
      date,
      time,
      summary: '客戶預約',
      description: `姓名：${name}\n電話：${phone}${note ? `\n備註：${note}` : ''}`
    };
    
    const newEvent = await calendarService.createEvent(newEventData);
    
    res.json({
      success: true,
      message: '預約修改成功',
      data: {
        id: newEvent.id,
        name,
        phone,
        date,
        time,
        note,
        check_status: '已確認'
      }
    });
  } catch (error) {
    console.error('修改預約失敗:', error);
    res.status(500).json({
      success: false,
      message: '修改預約失敗',
      error: error.message
    });
  }
});

// 12. 批量操作預約
router.post('/reservations/batch', async (req, res) => {
  try {
    const { action, reservation_ids } = req.body;
    
    if (!action || !reservation_ids || !Array.isArray(reservation_ids)) {
      return res.status(400).json({
        success: false,
        message: '請提供操作類型和預約ID列表'
      });
    }
    
    const calendarService = new GoogleCalendarService();
    const results = [];
    
    for (const id of reservation_ids) {
      try {
        if (action === 'delete') {
          await calendarService.deleteEvent(id);
          results.push({ id, success: true, message: '刪除成功' });
        } else if (action === 'cancel') {
          // 取消預約（實際上是刪除事件）
          await calendarService.deleteEvent(id);
          results.push({ id, success: true, message: '取消成功' });
        } else {
          results.push({ id, success: false, message: '不支持的操作類型' });
        }
      } catch (error) {
        results.push({ id, success: false, message: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    res.json({
      success: true,
      message: `批量操作完成：成功 ${successCount} 個，失敗 ${failCount} 個`,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount
        }
      }
    });
  } catch (error) {
    console.error('批量操作預約失敗:', error);
    res.status(500).json({
      success: false,
      message: '批量操作預約失敗',
      error: error.message
    });
  }
});

// 13. 獲取預約統計報表
router.get('/reservations/report', async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'date' } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: '請提供開始日期和結束日期'
      });
    }
    
    const calendarService = new GoogleCalendarService();
    const events = await calendarService.getEventsByDateRange(start_date, end_date);
    
    // 過濾出預約事件
    const reservations = events
      .filter(event => event.summary && event.summary.includes('客戶預約'))
      .map(event => {
        const startTime = new Date(event.start.dateTime || event.start.date);
        return {
          date: startTime.toISOString().split('T')[0],
          time: startTime.toTimeString().slice(0, 5),
          hour: startTime.getHours()
        };
      });
    
    let report;
    
    if (group_by === 'date') {
      // 按日期分組
      const dateGroups = {};
      reservations.forEach(reservation => {
        const date = reservation.date;
        if (!dateGroups[date]) {
          dateGroups[date] = { date, count: 0, time_slots: {} };
        }
        dateGroups[date].count++;
        
        const timeSlot = reservation.time;
        if (!dateGroups[date].time_slots[timeSlot]) {
          dateGroups[date].time_slots[timeSlot] = 0;
        }
        dateGroups[date].time_slots[timeSlot]++;
      });
      
      report = Object.values(dateGroups).sort((a, b) => a.date.localeCompare(b.date));
    } else if (group_by === 'hour') {
      // 按小時分組
      const hourGroups = {};
      for (let hour = 10; hour <= 20; hour++) {
        hourGroups[hour] = { hour, count: 0 };
      }
      
      reservations.forEach(reservation => {
        const hour = reservation.hour;
        if (hourGroups[hour]) {
          hourGroups[hour].count++;
        }
      });
      
      report = Object.values(hourGroups);
    }
    
    res.json({
      success: true,
      data: {
        report,
        summary: {
          total_reservations: reservations.length,
          date_range: { start_date, end_date },
          group_by
        }
      }
    });
  } catch (error) {
    console.error('獲取預約報表失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取預約報表失敗',
      error: error.message
    });
  }
});

module.exports = router; 