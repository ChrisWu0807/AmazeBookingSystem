const { google } = require('googleapis');
require('dotenv').config();

class GoogleCalendarService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: './service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
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
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
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
      
      const response = await this.calendar.events.list({
        calendarId: 'primary',
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