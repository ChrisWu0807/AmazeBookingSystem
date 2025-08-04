import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SimpleTest = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testScheduleAPI = async () => {
    setLoading(true);
    try {
      // 測試當前週的資料
      const response = await axios.get('/api/reservations?week=2025-W32');
      setTestResult(`✅ 排程表 API 測試成功: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      setTestResult(`❌ 排程表 API 測試失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>簡單測試</h2>
      <button 
        className="btn btn-primary" 
        onClick={testScheduleAPI}
        disabled={loading}
      >
        測試排程表 API
      </button>
      
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
            whiteSpace: 'pre-wrap',
            fontSize: '12px'
          }}>
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SimpleTest; 