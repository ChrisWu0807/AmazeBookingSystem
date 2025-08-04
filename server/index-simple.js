const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const moment = require('moment');
const GoogleCalendarService = require('./googleCalendar');

const app = express();
const PORT = process.env.PORT || 3050;

// 中間件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// 簡化的預約 API - 直接同步到 Google Calendar
app.post('/api/reservations', async (req, res) => {
  try {
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
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        success: false,
        message: '時間格式錯誤，請使用 HH:MM 格式'
      });
    }

    // 檢查是否為過去日期
    const selectedDate = moment(date);
    const today = moment().startOf('day');
    if (selectedDate.isBefore(today)) {
      return res.status(400).json({
        success: false,
        message: '不能預約過去的日期'
      });
    }

    const reservation = {
      name,
      phone,
      date,
      time,
      note: note || '',
      check: '未確認'
    };

    // 直接同步到 Google Calendar
    try {
      const calendarService = new GoogleCalendarService();
      const calendarEvent = await calendarService.createEvent(reservation);
      
      console.log('✅ 預約已直接同步到 Google Calendar:', calendarEvent.id);
      
      res.status(201).json({
        success: true,
        data: {
          ...reservation,
          calendarEventId: calendarEvent.id,
          calendarUrl: calendarEvent.htmlLink
        },
        message: '預約已成功同步到 Google Calendar'
      });
      
    } catch (calendarError) {
      console.error('❌ Google Calendar 同步失敗:', calendarError);
      res.status(500).json({
        success: false,
        message: 'Google Calendar 同步失敗，請稍後再試'
      });
    }

  } catch (error) {
    console.error('新增預約錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤'
    });
  }
});

// 獲取 Google Calendar 事件（用於檢查時段衝突）
app.get('/api/reservations/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: '日期格式錯誤'
      });
    }

    const calendarService = new GoogleCalendarService();
    const events = await calendarService.getEventsByDate(date);
    
    res.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('獲取日曆事件錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取日曆事件失敗'
    });
  }
});

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Amaze 預約系統 - 簡化版本',
    timestamp: new Date().toISOString()
  });
});

// 啟動伺服器
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Amaze 預約系統 - 簡化版本啟動成功`);
      console.log(`📅 直接同步到 Google Calendar`);
      console.log(`🌐 伺服器運行在: http://localhost:${PORT}`);
      console.log(`📱 前端應用: http://localhost:3051`);
    });
  } catch (error) {
    console.error('❌ 伺服器啟動失敗:', error);
    process.exit(1);
  }
}

startServer(); 