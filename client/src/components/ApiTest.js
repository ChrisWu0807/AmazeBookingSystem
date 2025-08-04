import React, { useState } from 'react';
import api from '../config/api';

const ApiTest = () => {
  const [healthStatus, setHealthStatus] = useState('');
  const [testResult, setTestResult] = useState('');

  const testHealth = async () => {
    try {
      const response = await api.get('/health');
      setHealthStatus(`✅ 健康檢查成功: ${JSON.stringify(response.data)}`);
    } catch (error) {
      setHealthStatus(`❌ 健康檢查失敗: ${error.message}`);
    }
  };

  const testReservation = async () => {
    const testData = {
      name: '測試客戶',
      phone: '0912345678',
      date: '2025-01-15',
      time: '14:00',
      note: '這是一個測試預約',
      check: '未確認'
    };

    try {
      const response = await api.post('/reservations', testData);
      setTestResult(`✅ 測試預約成功: ${JSON.stringify(response.data)}`);
    } catch (error) {
      setTestResult(`❌ 測試預約失敗: ${error.message}`);
    }
  };

  return (
    <div className="api-test">
      <h2>API 測試</h2>
      
      <div className="test-section">
        <button onClick={testHealth}>測試健康檢查</button>
        <div className="result">{healthStatus}</div>
      </div>
      
      <div className="test-section">
        <button onClick={testReservation}>測試預約 API</button>
        <div className="result">{testResult}</div>
      </div>
    </div>
  );
};

export default ApiTest; 