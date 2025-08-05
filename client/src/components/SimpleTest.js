import React, { useState } from 'react';
import api from '../config/api';

const SimpleTest = () => {
  const [testDate, setTestDate] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // 新的時間段設置
  const timeSlots = [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', 
    '19:00', '19:30', '20:00', '20:30'
  ];

  const getTimeSlotText = (time) => {
    const [hour, minute] = time.split(':');
    const currentHour = parseInt(hour);
    
    // 計算結束時間（1小時後）
    let endHour = currentHour + 1;
    
    // 處理跨日的情況
    if (endHour >= 24) {
      endHour = 0;
    }
    
    const endTime = `${endHour.toString().padStart(2, '0')}:${minute}`;
    return `${time} - ${endTime}`;
  };

  const testGetEvents = async () => {
    if (!testDate) {
      alert('請選擇日期');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/reservations/date/${testDate}`);
      setEvents(response.data.data || []);
      console.log('測試結果:', response.data);
    } catch (error) {
      console.error('測試失敗:', error);
      alert('測試失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>時段測試工具</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          測試日期:
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </label>
        <button
          onClick={testGetEvents}
          disabled={loading || !testDate}
          style={{ marginLeft: '10px', padding: '8px 16px' }}
        >
          {loading ? '載入中...' : '獲取事件'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>可用的時段:</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '8px',
            marginTop: '10px'
          }}>
            {timeSlots.map(slot => (
              <div key={slot} style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '12px'
              }}>
                {getTimeSlotText(slot)}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>該日期的預約事件:</h3>
          {events.length > 0 ? (
            <ul style={{ fontSize: '12px' }}>
              {events.map((event, index) => (
                <li key={index} style={{ marginBottom: '10px' }}>
                  <strong>{event.summary}</strong><br/>
                  開始: {new Date(event.start).toLocaleString()}<br/>
                  結束: {new Date(event.end).toLocaleString()}<br/>
                  描述: {event.description}
                </li>
              ))}
            </ul>
          ) : (
            <p>該日期沒有預約事件</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleTest; 