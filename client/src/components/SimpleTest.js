import React, { useState } from 'react';
import api from '../config/api';

const SimpleTest = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testHealthCheck = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      const response = await api.get('/health');
      setTestResult(`✅ 後端連接成功: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      setTestResult(`❌ 後端連接失敗: ${error.message}`);
      if (error.response) {
        setTestResult(`❌ 後端連接失敗: ${error.response.status} - ${error.response.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testReservation = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      const testData = {
        name: '測試用戶',
        phone: '0912345678',
        date: '2025-01-15',
        time: '10:00',
        note: '這是一個測試預約'
      };
      
      const response = await api.post('/reservations', testData);
      setTestResult(`✅ 預約測試成功: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      setTestResult(`❌ 預約測試失敗: ${error.message}`);
      if (error.response) {
        setTestResult(`❌ 預約測試失敗: ${error.response.status} - ${error.response.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <h1>API 測試頁面</h1>
      
      <div className="test-buttons">
        <button 
          onClick={testHealthCheck}
          disabled={loading}
          className="btn btn-primary"
          style={{ marginRight: '10px' }}
        >
          {loading ? '測試中...' : '測試後端連接'}
        </button>
        
        <button 
          onClick={testReservation}
          disabled={loading}
          className="btn btn-secondary"
        >
          {loading ? '測試中...' : '測試預約功能'}
        </button>
      </div>
      
      {testResult && (
        <div className="test-result">
          <h3>測試結果:</h3>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '5px',
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

export default SimpleTest; 