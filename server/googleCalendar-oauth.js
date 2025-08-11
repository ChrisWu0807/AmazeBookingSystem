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
    this.calendarId = 'c_1e63bb3f36499d33d3bcf134b0b2eb69796a045fc5dcc2b548d8983250f369b4@group.calendar.google.com'; // 主日曆ID（用於預約）
    this.holidayCalendarId = 'c_bef9794df3c8b577443f97fff8834e6225e0cd13bf95aa32e4e37901a6602303@group.calendar.google.com'; // 假日日曆ID
    
    // 嘗試載入已保存的令牌
    this.loadTokens();
  }

  // 載入已保存的令牌
  loadTokens() {
    try {
      // 優先從環境變數讀取
      if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
        const tokens = {
          access_token: process.env.GOOGLE_ACCESS_TOKEN,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          expiry_date: process.env.GOOGLE_TOKEN_EXPIRY ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY) : null
        };
        this.oauth2Client.setCredentials(tokens);
        console.log('✅ 已從環境變數載入令牌');
        return;
      }
      
      // 如果環境變數沒有，嘗試從檔案讀取（本地開發用）
      if (fs.existsSync('./tokens.json')) {
        const tokens = JSON.parse(fs.readFileSync('./tokens.json', 'utf8'));
        this.oauth2Client.setCredentials(tokens);
        console.log('✅ 已從檔案載入令牌');
      } else {
        console.log('⚠️ 無法載入令牌，需要重新授權');
      }
    } catch (error) {
      console.log('⚠️ 無法載入令牌，需要重新授權');
    }
  }

  // 保存令牌到文件
  saveTokens(tokens) {
    try {
      // 在 Zeabur 環境中，主要使用環境變數
      // 這裡保留檔案儲存作為備用（本地開發用）
      if (process.env.NODE_ENV !== 'production') {
        fs.writeFileSync('./tokens.json', JSON.stringify(tokens, null, 2));
        console.log('✅ 令牌已保存到檔案');
      }
      
      // 在生產環境中，建議將令牌設置為環境變數
      console.log('ℹ️ 在生產環境中，請將以下令牌設置為環境變數:');
      console.log('GOOGLE_ACCESS_TOKEN:', tokens.access_token);
      console.log('GOOGLE_REFRESH_TOKEN:', tokens.refresh_token);
      if (tokens.expiry_date) {
        console.log('GOOGLE_TOKEN_EXPIRY:', tokens.expiry_date);
      }
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

  async createEvent(reservation, calendarId = null) {
    if (!this.isAuthorized()) {
      throw new Error('未授權，請先完成 OAuth 2.0 授權流程');
    }

    // 使用指定的日曆ID或默認日曆ID
    const targetCalendarId = calendarId || this.calendarId;

    // 檢查是否是假日事件（沒有time字段）
    const isHolidayEvent = !reservation.time;
    
    let event;
    
    if (isHolidayEvent) {
      // 假日事件
      if (reservation.time) {
        // 部分時段限制的假日事件
        event = {
          summary: reservation.summary || reservation.description,
          description: reservation.description || '',
          start: {
            dateTime: `${reservation.date}T${reservation.time}:00+08:00`,
            timeZone: 'Asia/Taipei',
          },
          end: {
            dateTime: `${reservation.date}T${this.getEndTime(reservation.time)}:00+08:00`,
            timeZone: 'Asia/Taipei',
          },
          colorId: '4', // 紅色，表示假日
          transparency: 'opaque'
        };
      } else {
        // 完全休息日的假日事件
        event = {
          summary: reservation.summary || reservation.description,
          description: reservation.description || '',
          start: {
            date: reservation.date,
            timeZone: 'Asia/Taipei',
          },
          end: {
            date: reservation.date,
            timeZone: 'Asia/Taipei',
          },
          colorId: '4', // 紅色，表示假日
          transparency: 'opaque'
        };
      }
    } else {
      // 預約事件
      event = {
        summary: `${reservation.name} ${reservation.phone}`,
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
    }

    try {
      const response = await this.calendar.events.insert({
        calendarId: targetCalendarId,
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
          return await this.createEvent(reservation, calendarId);
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
        start: event.start.dateTime || event.start.date, // 支持dateTime和date格式
        end: event.end.dateTime || event.end.date, // 支持dateTime和date格式
        description: event.description
      }));
    } catch (error) {
      console.error('❌ 獲取日曆事件失敗:', error);
      throw error;
    }
  }

  // 新增：獲取假日日曆事件
  async getHolidayEventsByDate(date) {
    if (!this.isAuthorized()) {
      throw new Error('未授權，請先完成 OAuth 2.0 授權流程');
    }

    try {
      const startOfDay = `${date}T00:00:00+08:00`;
      const endOfDay = `${date}T23:59:59+08:00`;
      
      const response = await this.calendar.events.list({
        calendarId: this.holidayCalendarId,
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      return response.data.items.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        description: event.description
      }));
    } catch (error) {
      console.error('❌ 獲取假日日曆事件失敗:', error);
      // 如果無法訪問假日日曆，返回空數組
      return [];
    }
  }

  // 新增：檢查指定時段是否為假日
  async checkHolidayConflict(date, time) {
    try {
      const holidayEvents = await this.getHolidayEventsByDate(date);
      
      if (holidayEvents.length === 0) {
        return false; // 沒有假日事件
      }
      
      // 檢查是否有全天假日事件
      const fullDayHoliday = holidayEvents.find(event => {
        const start = event.start;
        return !start.includes('T'); // 全天事件沒有時間部分
      });
      
      if (fullDayHoliday) {
        return true; // 全天假日
      }
      
      // 檢查指定時段是否與假日事件衝突
      const targetTime = `${date}T${time}:00+08:00`;
      const targetEndTime = `${date}T${this.getEndTime(time)}:00+08:00`;
      
      return holidayEvents.some(event => {
        if (!event.start.includes('T')) {
          return false; // 全天事件不影響特定時段
        }
        
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const targetStart = new Date(targetTime);
        const targetEnd = new Date(targetEndTime);
        
        // 檢查時間重疊
        return eventStart < targetEnd && eventEnd > targetStart;
      });
    } catch (error) {
      console.error('❌ 檢查假日衝突失敗:', error);
      return false; // 如果無法檢查，允許預約
    }
  }

  async getEventsByDateRange(startDate, endDate) {
    if (!this.isAuthorized()) {
      throw new Error('未授權，請先完成 OAuth 2.0 授權流程');
    }

    try {
      const startOfRange = `${startDate}T00:00:00+08:00`;
      const endOfRange = `${endDate}T23:59:59+08:00`;
      
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startOfRange,
        timeMax: endOfRange,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      return response.data.items;
    } catch (error) {
      console.error('❌ 獲取日期範圍事件失敗:', error);
      throw error;
    }
  }

  async getEvent(eventId, calendarId = null) {
    if (!this.isAuthorized()) {
      throw new Error('未授權，請先完成 OAuth 2.0 授權流程');
    }

    // 使用指定的日曆ID或默認日曆ID
    const targetCalendarId = calendarId || this.calendarId;

    try {
      const response = await this.calendar.events.get({
        calendarId: targetCalendarId,
        eventId: eventId
      });
      
      console.log('✅ 獲取 Google Calendar 事件成功:', eventId);
      return response.data;
    } catch (error) {
      console.error('❌ 獲取 Google Calendar 事件失敗:', error);
      
      // 如果是令牌過期，嘗試刷新
      if (error.code === 401) {
        console.log('🔄 嘗試刷新令牌...');
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          // 重試獲取事件
          return await this.getEvent(eventId, calendarId);
        }
      }
      
      throw error;
    }
  }

  async deleteEvent(eventId, calendarId = null) {
    if (!this.isAuthorized()) {
      throw new Error('未授權，請先完成 OAuth 2.0 授權流程');
    }

    // 使用指定的日曆ID或默認日曆ID
    const targetCalendarId = calendarId || this.calendarId;

    try {
      await this.calendar.events.delete({
        calendarId: targetCalendarId,
        eventId: eventId
      });
      
      console.log('✅ Google Calendar 事件已刪除:', eventId);
      return true;
    } catch (error) {
      console.error('❌ 刪除 Google Calendar 事件失敗:', error);
      
      // 如果是令牌過期，嘗試刷新
      if (error.code === 401) {
        console.log('🔄 嘗試刷新令牌...');
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          // 重試刪除事件
          return await this.deleteEvent(eventId, calendarId);
        }
      }
      
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

  // 新增：根據週範圍獲取事件
  async getEventsByWeekRange(startDate, endDate) {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: `${startDate}T00:00:00+08:00`,
        timeMax: `${endDate}T23:59:59+08:00`,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      // 轉換為預約格式
      const reservations = response.data.items.map(event => {
        const start = new Date(event.start.dateTime || event.start.date);
        const end = new Date(event.end.dateTime || event.end.date);
        
        return {
          id: event.id,
          name: event.summary || '未命名預約',
          phone: event.description || '',
          date: start.toISOString().split('T')[0],
          time: start.toTimeString().slice(0, 5),
          note: event.description || '',
          check: event.colorId === '1' ? '已確認' : '未確認', // 使用顏色來標記狀態
          created_at: event.created,
          updated_at: event.updated
        };
      });
      
      return reservations;
    } catch (error) {
      console.error('❌ 獲取週範圍事件失敗:', error);
      throw error;
    }
  }

  // 新增：更新事件狀態
  async updateEventStatus(eventId, status) {
    try {
      // 獲取現有事件
      const event = await this.getEvent(eventId);
      
      // 更新事件顏色（狀態標記）
      const colorId = status === '已確認' ? '1' : '0';
      
      const updatedEvent = await this.calendar.events.patch({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: {
          colorId: colorId
        }
      });
      
      console.log('✅ 事件狀態已更新:', eventId, status);
      
      // 返回更新後的事件
      return {
        id: updatedEvent.data.id,
        name: updatedEvent.data.summary || '未命名預約',
        phone: updatedEvent.data.description || '',
        date: new Date(updatedEvent.data.start.dateTime || updatedEvent.data.start.date).toISOString().split('T')[0],
        time: new Date(updatedEvent.data.start.dateTime || updatedEvent.data.start.date).toTimeString().slice(0, 5),
        note: updatedEvent.data.description || '',
        check: status,
        created_at: updatedEvent.data.created,
        updated_at: updatedEvent.data.updated
      };
    } catch (error) {
      console.error('❌ 更新事件狀態失敗:', error);
      throw error;
    }
  }

  // 新增：獲取所有事件
  async getAllEvents() {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: new Date(new Date().getFullYear(), 0, 1).toISOString(), // 從今年年初開始
        timeMax: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59).toISOString(), // 到今年年底
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      // 轉換為預約格式
      const reservations = response.data.items.map(event => {
        const start = new Date(event.start.dateTime || event.start.date);
        const end = new Date(event.end.dateTime || event.end.date);
        
        return {
          id: event.id,
          name: event.summary || '未命名預約',
          phone: event.description || '',
          date: start.toISOString().split('T')[0],
          time: start.toTimeString().slice(0, 5),
          note: event.description || '',
          check: event.colorId === '1' ? '已確認' : '未確認',
          created_at: event.created,
          updated_at: event.updated
        };
      });
      
      return reservations;
    } catch (error) {
      console.error('❌ 獲取所有事件失敗:', error);
      throw error;
    }
  }
}

module.exports = GoogleCalendarService; 