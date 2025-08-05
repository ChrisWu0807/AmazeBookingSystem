const express = require('express');
const router = express.Router();
const DatabaseService = require('./database');
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

// 1. 獲取所有預約
router.get('/reservations', async (req, res) => {
  try {
    const db = new DatabaseService();
    await db.connect();
    
    const { page = 1, limit = 20, status, date } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT * FROM reservations 
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      sql += ` AND check_status = ?`;
      params.push(status);
    }
    
    if (date) {
      sql += ` AND date = ?`;
      params.push(date);
    }
    
    sql += ` ORDER BY date DESC, time ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    const reservations = await db.all(sql, params);
    
    // 獲取總數
    let countSql = `SELECT COUNT(*) as total FROM reservations WHERE 1=1`;
    const countParams = [];
    
    if (status) {
      countSql += ` AND check_status = ?`;
      countParams.push(status);
    }
    
    if (date) {
      countSql += ` AND date = ?`;
      countParams.push(date);
    }
    
    const totalResult = await db.get(countSql, countParams);
    const total = totalResult.total;
    
    res.json({
      success: true,
      data: {
        reservations,
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

// 2. 更新預約狀態
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
    
    const db = new DatabaseService();
    await db.connect();
    
    await db.run(
      'UPDATE reservations SET check_status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({
      success: true,
      message: '預約狀態更新成功'
    });
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
    
    const db = new DatabaseService();
    await db.connect();
    
    // 先獲取預約信息
    const reservation = await db.get('SELECT * FROM reservations WHERE id = ?', [id]);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: '預約不存在'
      });
    }
    
    // 刪除預約
    await db.run('DELETE FROM reservations WHERE id = ?', [id]);
    
    // 如果預約已同步到Google Calendar，也刪除日曆事件
    if (reservation.google_event_id) {
      try {
        const calendarService = new GoogleCalendarService();
        await calendarService.deleteEvent(reservation.google_event_id);
      } catch (calendarError) {
        console.error('刪除Google Calendar事件失敗:', calendarError);
      }
    }
    
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
    
    const db = new DatabaseService();
    await db.connect();
    
    const sql = `
      SELECT time, COUNT(*) as count, 
             SUM(CASE WHEN check_status = '已確認' THEN 1 ELSE 0 END) as confirmed_count,
             SUM(CASE WHEN check_status = '未確認' THEN 1 ELSE 0 END) as pending_count,
             SUM(CASE WHEN check_status = '已取消' THEN 1 ELSE 0 END) as cancelled_count
      FROM reservations 
      WHERE date = ?
      GROUP BY time
      ORDER BY time
    `;
    
    const stats = await db.all(sql, [date]);
    
    res.json({
      success: true,
      data: stats
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
    
    // 創建假日事件
    const event = {
      summary: description,
      description: JSON.stringify(time_slots), // 將限制時段存儲在描述中
      start: {
        date: date,
        timeZone: 'Asia/Taipei'
      },
      end: {
        date: date,
        timeZone: 'Asia/Taipei'
      },
      colorId: '4', // 紅色，表示假日
      transparency: 'opaque'
    };
    
    const createdEvent = await calendarService.createEvent(event);
    
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
    const db = new DatabaseService();
    await db.connect();
    
    // 今日預約數
    const today = moment().format('YYYY-MM-DD');
    const todayStats = await db.get(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN check_status = '已確認' THEN 1 ELSE 0 END) as confirmed,
             SUM(CASE WHEN check_status = '未確認' THEN 1 ELSE 0 END) as pending,
             SUM(CASE WHEN check_status = '已取消' THEN 1 ELSE 0 END) as cancelled
      FROM reservations 
      WHERE date = ?
    `, [today]);
    
    // 本週預約數
    const weekStart = moment().startOf('week').format('YYYY-MM-DD');
    const weekEnd = moment().endOf('week').format('YYYY-MM-DD');
    const weekStats = await db.get(`
      SELECT COUNT(*) as total
      FROM reservations 
      WHERE date BETWEEN ? AND ?
    `, [weekStart, weekEnd]);
    
    // 總預約數
    const totalStats = await db.get(`
      SELECT COUNT(*) as total
      FROM reservations
    `);
    
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