import React, { useState, useEffect } from 'react';
import api from '../config/api';

const SimpleTest = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reservations?week=2025-W32');
      setReservations(response.data.data || []);
    } catch (error) {
      console.error('獲取預約失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  return (
    <div className="simple-test">
      <h2>簡單測試</h2>
      <button onClick={fetchReservations} disabled={loading}>
        {loading ? '載入中...' : '重新載入預約'}
      </button>
      
      <div className="reservations-list">
        {reservations.map((reservation, index) => (
          <div key={index} className="reservation-item">
            <h3>{reservation.name}</h3>
            <p>電話: {reservation.phone}</p>
            <p>日期: {reservation.date}</p>
            <p>時間: {reservation.time}</p>
            <p>狀態: {reservation.check}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleTest; 