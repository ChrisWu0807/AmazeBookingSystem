import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DebugSchedule = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testScheduleData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/reservations?week=2025-W32');
      setData(response.data);
      console.log('排程表資料:', response.data);
    } catch (err) {
      setError(err.message);
      console.error('排程表載入錯誤:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testScheduleData();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>排程表調試</h2>
      
      <button 
        className="btn btn-primary" 
        onClick={testScheduleData}
        disabled={loading}
        style={{ marginBottom: '20px' }}
      >
        {loading ? '載入中...' : '重新載入資料'}
      </button>

      {error && (
        <div className="alert alert-error">
          <strong>錯誤：</strong> {error}
        </div>
      )}

      {data && (
        <div className="card">
          <h3>API 回應資料：</h3>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            fontSize: '12px'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
          
          <h4 style={{ marginTop: '20px' }}>預約數量：{data.data?.reservations?.length || 0}</h4>
          
          {data.data?.reservations?.map((reservation, index) => (
            <div key={index} style={{ 
              border: '1px solid #ddd', 
              padding: '10px', 
              margin: '10px 0',
              borderRadius: '4px'
            }}>
              <strong>{reservation.name}</strong> - {reservation.date} {reservation.time}
              <br />
              狀態: {reservation.check} | 電話: {reservation.maskedPhone}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugSchedule; 