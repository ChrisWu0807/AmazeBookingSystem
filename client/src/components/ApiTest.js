import React, { useState } from 'react';
import axios from 'axios';

const ApiTest = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/health');
      setTestResult(`✅ API 連接成功: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      setTestResult(`❌ API 連接失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCreateReservation = async () => {
    setLoading(true);
    try {
      const testData = {
        name: '測試客戶',
        phone: '0912345678',
        date: '2025-01-15',
        time: '15:00',
        note: 'API 測試預約',
        check: '未確認'
      };

      const response = await axios.post('/api/reservations', testData);
      setTestResult(`✅ 新增預約成功: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      setTestResult(`❌ 新增預約失敗: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>API 測試</h2>
      <div style={{ marginBottom: '20px' }}>
        <button 
          className="btn btn-primary" 
          onClick={testApi}
          disabled={loading}
          style={{ marginRight: '10px' }}
        >
          測試 API 連接
        </button>
        <button 
          className="btn btn-success" 
          onClick={testCreateReservation}
          disabled={loading}
        >
          測試新增預約
        </button>
      </div>
      
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          測試中...
        </div>
      )}
      
      {testResult && (
        <div className="card">
          <h3>測試結果：</h3>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiTest; 