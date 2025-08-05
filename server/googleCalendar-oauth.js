const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

class GoogleCalendarService {
  constructor() {
    // OAuth 2.0 配置
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
      process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE',
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3050/auth/callback'
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.calendarId = 'primary'; // 使用 primary 日曆
    
    // 嘗試載入已保存的令牌
    this.loadTokens();
  }

  // 載入已保存的令牌
  loadTokens() {
    try {
      if (fs.existsSync('./tokens.json')) {
        const tokens = JSON.parse(fs.readFileSync('./tokens.json', 'utf8'));
        this.oauth2Client.setCredentials(tokens);
        console.log('✅ 已載入保存的令牌');
      }
    } catch (error) {
      console.log('⚠️ 無法載入令牌，需要重新授權');
    }
  }

  // 保存令牌到文件
  saveTokens(tokens) {
    try {
      fs.writeFileSync('./tokens.json', JSON.stringify(tokens, null, 2));
      console.log('✅ 令牌已保存');
    } catch (error) {
      console.error('❌ 保存令牌失敗:', error.message);
    }
  }

  // 生成授權 URL
  generateAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // 處理授權回調
  async handleAuthCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.saveTokens(tokens);
      console.log('✅ OAuth 2.0 授權成功');
      return true;
    } catch (error) {
      console.error('❌ OAuth 2.0 授權失敗:', error.message);
      return false;
    }
  }

  // 檢查授權狀態
  isAuthorized() {
    const credentials = this.oauth2Client.credentials;
    return credentials && credentials.access_token;
  }

  // 刷新令牌
  async refreshTokens() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      this.saveTokens(credentials);
      console.log('✅ 令牌已刷新');
      return true;
    } catch (error) {
      console.error('❌ 刷新令牌失敗:', error.message);
      return false;
    }
  }

  async createEvent(reservation) {
    if (!this.isAuthorized()) {
      throw new Error('未授權，請先完成 OAuth 2.0 授權流程');
    }

    const event = {
      summary: `📅 客戶預約 - ${reservation.name}`,
      description: `
📞 電話：${reservation.phone}
📝 備註：${reservation.note || '無'}
✅ 狀態：${reservation.check}
🕐 預約時間：${reservation.date} ${reservation.time}
      `.trim(),
      start: {
        dateTime: `${reservation.date}T${reservation.time}:00+08:00`,
        timeZone: 'Asia/Taipei',
      },
      end: {
        dateTime: `${reservation.date}T${this.getEndTime(reservation.time)}:00+08:00`,
        timeZone: 'Asia/Taipei',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1天前
          { method: 'popup', minutes: 30 }, // 30分鐘前
        ],
      },
      colorId: '1', // 藍色
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });
      
      console.log('✅ Google Calendar 事件已建立:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Google Calendar 事件建立失敗:', error);
      
      // 如果是令牌過期，嘗試刷新
      if (error.code === 401) {
        console.log('🔄 嘗試刷新令牌...');
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          // 重試創建事件
          return await this.createEvent(reservation);
        }
      }
      
      throw error;
    }
  }

  getEndTime(startTime) {
    const [hour, minute] = startTime.split(':');
    const currentHour = parseInt(hour);
    
    // 計算結束時間（1小時後）
    let endHour = currentHour + 1;
    
    // 處理跨日的情況
    if (endHour >= 24) {
      endHour = 0;
    }
    
    return `${endHour.toString().padStart(2, '0')}:${minute}`;
  }

  async getEventsByDate(date) {
    if (!this.isAuthorized()) {
      throw new Error('未授權，請先完成 OAuth 2.0 授權流程');
    }

    try {
      const startOfDay = `${date}T00:00:00+08:00`;
      const endOfDay = `${date}T23:59:59+08:00`;
      
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      return response.data.items.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start.dateTime,
        end: event.end.dateTime,
        description: event.description
      }));
    } catch (error) {
      console.error('❌ 獲取日曆事件失敗:', error);
      throw error;
    }
  }

  async checkTimeSlotConflict(date, time) {
    try {
      const events = await this.getEventsByDate(date);
      const targetTime = `${date}T${time}:00+08:00`;
      
      // 計算該時段的預約數量
      const slotCount = events.filter(event => {
        const eventStart = new Date(event.start);
        const targetStart = new Date(targetTime);
        return eventStart.getTime() === targetStart.getTime();
      }).length;
      
      // 如果該時段已有2組或以上預約，則衝突
      return slotCount >= 2;
    } catch (error) {
      console.error("❌ 檢查時段衝突失敗:", error);
      // 如果無法連接到 Google Calendar，返回 false（允許預約）
      return false;
    }
  }
}

module.exports = GoogleCalendarService; 