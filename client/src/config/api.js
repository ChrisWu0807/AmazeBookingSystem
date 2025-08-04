import axios from 'axios';

// API 配置
const getApiBaseUrl = () => {
  // 在生產環境中，使用相對路徑（會被代理到後端）
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  
  // 在開發環境中，使用環境變數或默認值
  return process.env.REACT_APP_API_URL || 'http://localhost:3050';
};

// 創建 axios 實例
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 在生產環境中，確保使用相對路徑
    if (process.env.NODE_ENV === 'production') {
      config.url = `/api${config.url.replace('/api', '')}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API 錯誤:', error);
    return Promise.reject(error);
  }
);

export default api; 