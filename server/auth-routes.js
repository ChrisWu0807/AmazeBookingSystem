const express = require('express');
const GoogleCalendarService = require('./googleCalendar-oauth');

const router = express.Router();
const calendarService = new GoogleCalendarService();

// 生成授權 URL
router.get('/auth/google', (req, res) => {
  try {
    const authUrl = calendarService.generateAuthUrl();
    console.log('🔗 生成授權 URL:', authUrl);
    res.json({
      success: true,
      authUrl: authUrl,
      message: '請訪問此 URL 完成授權'
    });
  } catch (error) {
    console.error('❌ 生成授權 URL 失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '生成授權 URL 失敗',
      error: error.message
    });
  }
});

// 處理授權回調
router.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少授權碼'
      });
    }

    console.log('🔄 處理授權回調，授權碼:', code.substring(0, 10) + '...');
    
    const success = await calendarService.handleAuthCallback(code);
    
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

// 檢查授權狀態
router.get('/auth/status', (req, res) => {
  try {
    const isAuthorized = calendarService.isAuthorized();
    res.json({
      success: true,
      authorized: isAuthorized,
      message: isAuthorized ? '已授權' : '未授權'
    });
  } catch (error) {
    console.error('❌ 檢查授權狀態失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '檢查授權狀態失敗',
      error: error.message
    });
  }
});

// 測試連接
router.get('/auth/test', async (req, res) => {
  try {
    if (!calendarService.isAuthorized()) {
      return res.status(401).json({
        success: false,
        message: '未授權，請先完成 OAuth 2.0 授權'
      });
    }

    // 測試獲取日曆信息
    const today = new Date().toISOString().split('T')[0];
    const events = await calendarService.getEventsByDate(today);
    
    res.json({
      success: true,
      message: '連接測試成功',
      eventsCount: events.length,
      calendarId: calendarService.calendarId
    });
  } catch (error) {
    console.error('❌ 連接測試失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '連接測試失敗',
      error: error.message
    });
  }
});

module.exports = router; 