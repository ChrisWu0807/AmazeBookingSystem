// 載入環境變數配置
require('./env-config');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const moment = require('moment');
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const GoogleCalendarService = require('./googleCalendar-oauth');
const authRoutes = require('./auth-routes');
const adminRoutes = require('./admin-routes');

const app = express();
const PORT = process.env.PORT || 8080;

// 中間件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

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

// Webhook 發送函數
const sendReminderWebhook = async (reservationData) => {
  try {
    const webhookUrl = 'https://amazebookingfollowup.zeabur.app/webhook/962ff2e9-af9a-4eab-bed9-692af50e95d9';
    
    // 構建查詢參數
    const params = new URLSearchParams({
      reservation_id: reservationData.id,
      name: reservationData.name,
      phone: reservationData.phone,
      date: reservationData.date,
      time: reservationData.time,
      note: reservationData.note || '',
      created_at: new Date().toISOString()
    });

    const fullUrl = `${webhookUrl}?${params.toString()}`;
    console.log('📤 發送提醒 webhook:', fullUrl);

    // 使用 Node.js 原生的 https 模組
    const https = require('https');
    const url = require('url');
    
    const parsedUrl = url.parse(fullUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Amaze-Booking-System/1.0'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ 提醒 webhook 發送成功');
            resolve(data);
          } else {
            console.error('❌ 提醒 webhook 發送失敗:', res.statusCode, data);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ 發送提醒 webhook 失敗:', error.message);
        reject(error);
      });

      req.end();
    });
  } catch (error) {
    console.error('❌ 發送提醒 webhook 失敗:', error.message);
  }
};

// 添加授權路由
app.use('/api', authRoutes);

// 添加管理員路由
app.use('/api/admin', adminRoutes);

// 添加授權回調路由（不在 /api 路徑下）
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少授權碼'
      });
    }

    console.log('🔄 處理授權回調，授權碼:', code.substring(0, 10) + '...');
    
    const calendarServiceForAuth = new GoogleCalendarService();
    const success = await calendarServiceForAuth.handleAuthCallback(code);
    
    if (success) {
      res.json({
        success: true,
        message: 'OAuth 2.0 授權成功！現在可以使用預約功能了。'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'OAuth 2.0 授權失敗'
      });
    }
  } catch (error) {
    console.error('❌ 處理授權回調失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '處理授權回調失敗',
      error: error.message
    });
  }
});

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

    // 創建Google Calendar服務實例
    const calendarService = new GoogleCalendarService();
    
    // 檢查是否為假日（從假日日曆）
    try {
      const isHolidayConflict = await calendarService.checkHolidayConflict(date, time);
      
      if (isHolidayConflict) {
        return res.status(400).json({
          success: false,
          message: '該時段為假日，暫停預約'
        });
      }
    } catch (error) {
      console.error('檢查假日失敗:', error);
      // 如果無法檢查假日，繼續預約流程
    }

    // 檢查時段是否已被預約
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
      const calendarEvent = await calendarService.createEvent(newReservation);
      console.log('✅ 預約已同步到 Google Calendar');
      
      // 發送提醒 webhook 到 n8n
      await sendReminderWebhook({
        ...newReservation,
        calendarEventId: calendarEvent.id
      });
      
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
    
    const weekReservations = await calendarService.getEventsByWeekRange(
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

    const calendarService = new GoogleCalendarService();
    const updatedReservation = await calendarService.updateEventStatus(id, check);

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
    
    const calendarService = new GoogleCalendarService();
    const deletedReservation = await calendarService.deleteEvent(id);

    res.json({
      success: true,
      data: deletedReservation,
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
    const calendarService = new GoogleCalendarService();
    const allReservations = await calendarService.getAllEvents();
    
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

    // 檢查是否為假日（從假日日曆）
    const calendarServiceForDate = new GoogleCalendarService();
    const dayReservations = await calendarServiceForDate.getEventsByDate(date);
    const holidayEvents = await calendarServiceForDate.getHolidayEventsByDate(date);
    
    // 處理假日信息
    let holidayInfo = null;
    if (holidayEvents.length > 0) {
      // 檢查是否為完全休息日（有date格式的事件）
      const fullDayHoliday = holidayEvents.find(event => event.start && !event.start.includes('T'));
      
      if (fullDayHoliday) {
        // 完全休息日
        holidayInfo = {
          id: fullDayHoliday.id,
          date: date,
          description: fullDayHoliday.summary,
          time_slots: []
        };
      } else {
        // 部分時段限制 - 收集所有限制時段
        const restrictedSlots = [];
        holidayEvents.forEach(event => {
          if (event.start && event.start.includes('T')) {
            const startTime = new Date(event.start);
            const timeSlot = startTime.toTimeString().slice(0, 5);
            restrictedSlots.push(timeSlot);
          }
        });
        
        holidayInfo = {
          id: holidayEvents[0].id,
          date: date,
          description: holidayEvents[0].summary,
          time_slots: restrictedSlots
        };
      }
    }

    // 如果有假日設置，添加假日信息到響應中
    const response = {
      success: true,
      data: dayReservations,
      holiday: holidayInfo
    };

    res.json(response);

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

// OAuth 授權頁面
app.get("/auth", (req, res) => {
  res.sendFile(path.join(__dirname, "public/auth.html"));
});

// 處理前端路由 - 所有非 API 路徑都返回前端應用
app.get("*", (req, res) => {
  // 排除 API 路由和授權回調
  if (req.path.startsWith('/api/') || req.path === '/auth/callback') {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});
async function startServer() {
  try {
    // 資料庫連接已移除，不再需要
    console.log('✅ 資料庫連接成功 (已移除)');
    
    app.listen(PORT, () => {
      console.log(`🚀 Amaze 預約系統後端 API 運行在 http://localhost:${PORT}`);
      console.log(`📅 健康檢查: http://localhost:${PORT}/api/health`);
      // 資料庫檔案路徑已移除，不再顯示
    });
  } catch (error) {
    console.error('❌ 啟動伺服器失敗:', error);
    process.exit(1);
  }
}

startServer(); 