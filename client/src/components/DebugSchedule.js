import React, { useState, useEffect } from 'react';
import api from '../config/api';

const DebugSchedule = () => {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reservations?week=2025-W32');
      setScheduleData(response.data.data || []);
    } catch (error) {
      console.error('獲取排程失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  return (
    <div className="debug-schedule">
      <h2>排程除錯</h2>
      <button onClick={fetchSchedule} disabled={loading}>
        {loading ? '載入中...' : '重新載入排程'}
      </button>
      
      <div className="schedule-data">
        <h3>排程資料:</h3>
        <pre>{JSON.stringify(scheduleData, null, 2)}</pre>
      </div>
    </div>
  );
};

export default DebugSchedule; 