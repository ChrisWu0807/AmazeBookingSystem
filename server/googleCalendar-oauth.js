const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleCalendarOAuthService {
  constructor() {
    // OAuth 2.0 配置
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3050/auth/google/callback'
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // 生成授權 URL
  getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
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
      
      // 保存 tokens 到檔案
      const tokenPath = path.join(__dirname, 'tokens.json');
      fs.writeFileSync(tokenPath, JSON.stringify(tokens));
      
      console.log('✅ OAuth 認證成功');
      return tokens;
    } catch (error) {
      console.error('❌ OAuth 認證失敗:', error);
      throw error;
    }
  }

  // 載入已保存的 tokens
  loadTokens() {
    try {
      const tokenPath = path.join(__dirname, 'tokens.json');
      if (fs.existsSync(tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(tokenPath));
        this.oauth2Client.setCredentials(tokens);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ 載入 tokens 失敗:', error);
      return false;
    }
  }

  // 檢查認證狀態
  async checkAuth() {
    try {
      const calendarList = await this.calendar.calendarList.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  // 創建預約事件
  async createEvent(reservation) {
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
        calendarId: 'primary', // 使用主要日曆
        resource: event,
      });
      
      console.log('✅ Google Calendar 事件已建立:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Google Calendar 事件建立失敗:', error);
      throw error;
    }
  }

  // 獲取特定日期的事件
  async getEventsByDate(date) {
    try {
      const startOfDay = `${date}T00:00:00+08:00`;
      const endOfDay = `${date}T23:59:59+08:00`;
      
      const response = await this.calendar.events.list({
        calendarId: 'primary', // 使用主要日曆
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

  getEndTime(startTime) {
    const hour = parseInt(startTime.split(':')[0]);
    const nextHour = hour === 23 ? 0 : hour + 1;
    return `${nextHour.toString().padStart(2, '0')}:00`;
  }
}

module.exports = GoogleCalendarOAuthService; 