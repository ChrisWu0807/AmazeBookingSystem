const { google } = require('googleapis');
require('dotenv').config();

class GoogleCalendarService {
  constructor() {
    // 從環境變數讀取憑證
    const credentials = {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
      universe_domain: "googleapis.com"
    };

    this.auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    this.calendarId = null;
    
    // 初始化時測試連接並確定日曆 ID
    this.initializeCalendar();
  }

  async initializeCalendar() {
    // 使用您提供的日曆 ID
    const calendarId = 'c_1e63bb3f36499d33d3bcf134b0b2eb69796a045fc5dcc2b548d8983250f369b4@group.calendar.google.com';
    
    try {
      const response = await this.calendar.calendars.get({
        calendarId: calendarId
      });
      this.calendarId = calendarId;
      console.log('✅ 使用指定日曆:', response.data.summary);
    } catch (error) {
      console.log('⚠️ 指定日曆不可用，嘗試 primary 日曆');
      
      try {
        const response = await this.calendar.calendars.get({
          calendarId: 'primary'
        });
        this.calendarId = 'primary';
        console.log('✅ 使用 primary 日曆:', response.data.summary);
      } catch (primaryError) {
        console.error('❌ 所有日曆連接都失敗');
        this.calendarId = 'primary'; // 作為後備
      }
    }
  }

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
      // 等待日曆初始化完成
      if (!this.calendarId) {
        await this.initializeCalendar();
      }
      
      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });
      
      console.log('✅ Google Calendar 事件已建立:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Google Calendar 事件建立失敗:', error);
      throw error;
    }
  }

  getEndTime(startTime) {
    const hour = parseInt(startTime.split(':')[0]);
    const nextHour = hour === 23 ? 0 : hour + 1;
    return `${nextHour.toString().padStart(2, '0')}:00`;
  }

  async getEventsByDate(date) {
    try {
      const startOfDay = `${date}T00:00:00+08:00`;
      const endOfDay = `${date}T23:59:59+08:00`;
      
      // 等待日曆初始化完成
      if (!this.calendarId) {
        await this.initializeCalendar();
      }
      
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
      
      // 檢查是否有相同時段的預約
      return events.some(event => {
        const eventStart = new Date(event.start);
        const targetStart = new Date(targetTime);
        return eventStart.getTime() === targetStart.getTime();
      });
    } catch (error) {
      console.error("❌ 檢查時段衝突失敗:", error);
      // 如果無法連接到 Google Calendar，返回 false（允許預約）
      return false;
    }
  }
}

module.exports = GoogleCalendarService; 