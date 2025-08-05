// 載入環境變數配置
require('./env-config');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const moment = require('moment');
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('./database');
const GoogleCalendarService = require('./googleCalendar-oauth');
const authRoutes = require('./auth-routes');

const app = express();
const PORT = process.env.PORT || 3050;

// 中間件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// 資料庫服務
const db = new DatabaseService();

// 工具函數
const getWeekRange = (weekStr) => {
  const [year, week] = weekStr.split('-W');
  const startOfWeek = moment().year(year).week(week).startOf('week');
  const endOfWeek = moment().year(year).week(week).endOf('week');
  return { startOfWeek, endOfWeek };
};

const maskPhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
};

// 添加授權路由
app.use('/api', authRoutes);

// API 路由

// 1. 新增預約資料
app.post('/api/reservations', async (req, res) => {
  try {
    const { name, phone, date, time, note, check = '未確認' } = req.body;
    
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

    // 檢查時段是否已被預約
    const calendarService = new GoogleCalendarService();
    const hasConflict = await calendarService.checkTimeSlotConflict(date, time);
    
    if (hasConflict) {
      return res.status(409).json({
        success: false,
        message: '該時段已被預約'
      });
    }

    const newReservation = {
      id: uuidv4(),
      name,
      phone,
      date,
      time,
      note: note || '',
      check
    };

    // 直接同步到 Google Calendar
    try {
      const calendarService = new GoogleCalendarService();
      const calendarEvent = await calendarService.createEvent(newReservation);
      console.log('✅ 預約已同步到 Google Calendar');
      
      res.status(201).json({
        success: true,
        data: {
          ...newReservation,
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

// 2. 查詢特定週的所有預約資料
app.get('/api/reservations', async (req, res) => {
  try {
    const { week } = req.query;
    
    if (!week) {
      return res.status(400).json({
        success: false,
        message: '請提供週參數 (格式: YYYY-WNN)'
      });
    }

    const { startOfWeek, endOfWeek } = getWeekRange(week);
    
    const weekReservations = await db.getReservationsByWeek(
      startOfWeek.format('YYYY-MM-DD'),
      endOfWeek.format('YYYY-MM-DD')
    );

    // 為每個預約添加隱碼電話並統一欄位名稱
    const reservationsWithMaskedPhone = weekReservations.map(reservation => ({
      ...reservation,
      check: reservation.check_status, // 統一欄位名稱
      maskedPhone: maskPhoneNumber(reservation.phone)
    }));

    res.json({
      success: true,
      data: {
        week,
        startDate: startOfWeek.format('YYYY-MM-DD'),
        endDate: endOfWeek.format('YYYY-MM-DD'),
        reservations: reservationsWithMaskedPhone
      }
    });

  } catch (error) {
    console.error('查詢預約錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤'
    });
  }
});

// 3. 更新 double check 狀態
app.patch('/api/reservations/:id/check', async (req, res) => {
  try {
    const { id } = req.params;
    const { check } = req.body;

    if (!check || !['已確認', '未確認'].includes(check)) {
      return res.status(400).json({
        success: false,
        message: 'check 欄位必須是 "已確認" 或 "未確認"'
      });
    }

    const reservation = await db.getReservation(id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預約'
      });
    }

    await db.updateReservationStatus(id, check);

    const updatedReservation = await db.getReservation(id);

    res.json({
      success: true,
      data: updatedReservation,
      message: '狀態更新成功'
    });

  } catch (error) {
    console.error('更新狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤'
    });
  }
});

// 4. 刪除預約
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await db.getReservation(id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預約'
      });
    }

    await db.deleteReservation(id);

    res.json({
      success: true,
      data: reservation,
      message: '預約刪除成功'
    });

  } catch (error) {
    console.error('刪除預約錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤'
    });
  }
});

// 5. 取得所有預約（用於管理）
app.get('/api/reservations/all', async (req, res) => {
  try {
    const allReservations = await db.getAllReservations();
    
    const reservationsWithMaskedPhone = allReservations.map(reservation => ({
      ...reservation,
      check: reservation.check_status, // 統一欄位名稱
      maskedPhone: maskPhoneNumber(reservation.phone)
    }));

    res.json({
      success: true,
      data: reservationsWithMaskedPhone
    });

  } catch (error) {
    console.error('取得所有預約錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤'
    });
  }
});

// 6. 取得特定日期的預約（用於檢查可用時段）
app.get('/api/reservations/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // 驗證日期格式
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: '日期格式錯誤，請使用 YYYY-MM-DD 格式'
      });
    }

    const calendarService = new GoogleCalendarService();
      const dayReservations = await calendarService.getEventsByDate(date);

    res.json({
      success: true,
      data: dayReservations
    });

  } catch (error) {
    console.error('取得日期預約錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤'
    });
  }
});

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Amaze 預約系統 API 運行正常',
    timestamp: new Date().toISOString()
  });
});

// 初始化資料庫並啟動伺服器

// 提供靜態文件服務
app.use(express.static(path.join(__dirname, "../client/build")));

// 處理前端路由 - 所有非 API 路徑都返回前端應用
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});
async function startServer() {
  try {
    await db.connect();
    console.log('✅ 資料庫連接成功');
    
    app.listen(PORT, () => {
      console.log(`🚀 Amaze 預約系統後端 API 運行在 http://localhost:${PORT}`);
      console.log(`📅 健康檢查: http://localhost:${PORT}/api/health`);
      console.log(`🗄️ 資料庫檔案: ${db.dbPath}`);
    });
  } catch (error) {
    console.error('❌ 啟動伺服器失敗:', error);
    process.exit(1);
  }
}

startServer(); 