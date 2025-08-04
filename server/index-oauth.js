const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const GoogleCalendarOAuthService = require('./googleCalendar-oauth');

const app = express();
const PORT = process.env.PORT || 3050;

// 設置環境變數
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 中間件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// 初始化 Google Calendar 服務
const calendarService = new GoogleCalendarOAuthService();

// 在生產環境中提供靜態檔案
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../client/build');
  console.log('📁 靜態檔案路徑:', staticPath);
  console.log('📁 靜態檔案是否存在:', fs.existsSync(staticPath));
  
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    console.log('✅ 靜態檔案服務已啟用');
  } else {
    console.log('❌ 靜態檔案目錄不存在，嘗試其他路徑...');
    
    // 嘗試其他可能的路徑
    const alternativePaths = [
      path.join(__dirname, '../../client/build'),
      path.join(__dirname, './client/build'),
      path.join(process.cwd(), 'client/build')
    ];
    
    for (const altPath of alternativePaths) {
      console.log('🔍 嘗試路徑:', altPath);
      if (fs.existsSync(altPath)) {
        app.use(express.static(altPath));
        console.log('✅ 靜態檔案服務已啟用 (替代路徑)');
        break;
      }
    }
  }
}

// 檢查認證狀態
app.get('/api/auth/status', async (req, res) => {
  try {
    // 嘗試載入已保存的 tokens
    const hasTokens = calendarService.loadTokens();
    
    if (hasTokens) {
      const isAuthenticated = await calendarService.checkAuth();
      if (isAuthenticated) {
        return res.json({
          success: true,
          authenticated: true,
          message: '已認證'
        });
      }
    }
    
    res.json({
      success: true,
      authenticated: false,
      message: '需要認證'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '認證檢查失敗'
    });
  }
});

// 獲取授權 URL
app.get('/api/auth/url', (req, res) => {
  try {
    const authUrl = calendarService.getAuthUrl();
    res.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '生成授權 URL 失敗'
    });
  }
});

// 處理授權回調
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少授權碼'
      });
    }
    
    await calendarService.handleAuthCallback(code);
    
    res.send(`
      <html>
        <head><title>認證成功</title></head>
        <body>
          <h1>✅ Google Calendar 認證成功！</h1>
          <p>您現在可以關閉此頁面，回到預約系統使用。</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('授權回調錯誤:', error);
    res.status(500).send(`
      <html>
        <head><title>認證失敗</title></head>
        <body>
          <h1>❌ 認證失敗</h1>
          <p>請重試或聯繫管理員。</p>
        </body>
      </html>
    `);
  }
});

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

    // 檢查認證狀態
    const hasTokens = calendarService.loadTokens();
    if (!hasTokens) {
      return res.status(401).json({
        success: false,
        message: '請先完成 Google Calendar 認證'
      });
    }

    const isAuthenticated = await calendarService.checkAuth();
    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: 'Google Calendar 認證已過期，請重新認證'
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

    // 檢查認證狀態
    const hasTokens = calendarService.loadTokens();
    if (!hasTokens) {
      return res.json({
        success: true,
        data: []
      });
    }

    const isAuthenticated = await calendarService.checkAuth();
    if (!isAuthenticated) {
      return res.json({
        success: true,
        data: []
      });
    }

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
    message: 'Amaze 預約系統 - OAuth 版本',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: PORT,
    cwd: process.cwd(),
    __dirname: __dirname
  });
});

// 處理所有其他路由（SPA 路由）
app.get('*', (req, res) => {
  console.log('🌐 訪問路由:', req.path);
  
  if (process.env.NODE_ENV === 'production') {
    // 嘗試多個可能的 index.html 路徑
    const possiblePaths = [
      path.join(__dirname, '../client/build/index.html'),
      path.join(__dirname, '../../client/build/index.html'),
      path.join(__dirname, './client/build/index.html'),
      path.join(process.cwd(), 'client/build/index.html')
    ];
    
    console.log('🔍 嘗試 index.html 路徑:');
    for (const indexPath of possiblePaths) {
      console.log('  -', indexPath, ':', fs.existsSync(indexPath));
      if (fs.existsSync(indexPath)) {
        console.log('✅ 找到 index.html:', indexPath);
        return res.sendFile(indexPath);
      }
    }
    
    console.log('❌ 所有路徑都不存在');
    res.status(404).json({
      success: false,
      message: '前端檔案不存在',
      paths: possiblePaths,
      cwd: process.cwd(),
      __dirname: __dirname
    });
  } else {
    res.status(404).json({
      success: false,
      message: '路由不存在'
    });
  }
});

// 啟動伺服器
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Amaze 預約系統 - OAuth 版本啟動成功`);
      console.log(`📅 使用主帳號 Google Calendar`);
      console.log(`🌐 伺服器運行在: http://localhost:${PORT}`);
      console.log(`📱 前端應用: http://localhost:3051`);
      console.log(`🔐 認證 URL: http://localhost:${PORT}/api/auth/url`);
      console.log(`🌍 環境: ${process.env.NODE_ENV}`);
      console.log(`📁 工作目錄: ${process.cwd()}`);
      console.log(`📁 __dirname: ${__dirname}`);
    });
  } catch (error) {
    console.error('❌ 伺服器啟動失敗:', error);
    process.exit(1);
  }
}

startServer(); 