// 載入環境變數配置
require('./env-config');

const express = require('express');
const GoogleCalendarService = require('./googleCalendar-oauth');

const app = express();
const PORT = process.env.PORT || 3050;

// 中間件
app.use(express.json());

// 創建日曆服務實例
const calendarService = new GoogleCalendarService();

// 授權頁面
app.get('/', (req, res) => {
  const isAuthorized = calendarService.isAuthorized();
  
  if (isAuthorized) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Amaze 預約系統 - OAuth 設置</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .success { color: green; }
          .info { color: blue; }
          .button { background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>🎉 OAuth 2.0 授權成功！</h1>
        <p class="success">✅ 您的 Google Calendar 已成功授權</p>
        <p>現在可以使用預約功能了。</p>
        <a href="/test" class="button">測試連接</a>
      </body>
      </html>
    `);
  } else {
    const authUrl = calendarService.generateAuthUrl();
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Amaze 預約系統 - OAuth 設置</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .info { color: blue; }
          .button { background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>🔐 Google Calendar OAuth 2.0 授權</h1>
        <p class="info">請點擊下面的按鈕完成 Google Calendar 授權：</p>
        <a href="${authUrl}" class="button">授權 Google Calendar</a>
        <p><small>授權後會自動重定向回此頁面</small></p>
      </body>
      </html>
    `);
  }
});

// 授權回調
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect('/?error=no_code');
    }
    
    const success = await calendarService.handleAuthCallback(code);
    
    if (success) {
      res.redirect('/?success=true');
    } else {
      res.redirect('/?error=auth_failed');
    }
  } catch (error) {
    console.error('授權回調錯誤:', error.message);
    res.redirect('/?error=callback_error');
  }
});

// 測試連接
app.get('/test', async (req, res) => {
  try {
    if (!calendarService.isAuthorized()) {
      return res.redirect('/');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const events = await calendarService.getEventsByDate(today);
    
    res.json({
      success: true,
      message: '連接測試成功',
      eventsCount: events.length,
      calendarId: calendarService.calendarId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '測試失敗',
      error: error.message
    });
  }
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`🚀 OAuth 設置服務器已啟動: http://localhost:${PORT}`);
  console.log('📝 請在瀏覽器中打開上述 URL 完成授權');
}); 