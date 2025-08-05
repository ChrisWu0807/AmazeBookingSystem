import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Clock, 
  Settings, 
  Trash2, 
  Edit, 
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  CalendarDays
} from 'lucide-react';
import api from '../config/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('reservations');
  const [reservations, setReservations] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 分頁狀態
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // 篩選狀態
  const [filters, setFilters] = useState({
    status: '',
    date: ''
  });

  // 新增假日狀態
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    description: '',
    time_slots: []
  });

  // 管理員token（實際應用中應該從登入獲取）
  const adminToken = 'amaze-admin-2024';

  // 獲取預約列表
  const fetchReservations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await api.get(`/admin/reservations?${params}`, {
        headers: { 'admin-token': adminToken }
      });

      if (response.data.success) {
        setReservations(response.data.data.reservations);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('獲取預約列表失敗:', error);
      setMessage({ type: 'error', text: '獲取預約列表失敗' });
    } finally {
      setLoading(false);
    }
  };

  // 獲取假日列表
  const fetchHolidays = async () => {
    try {
      const response = await api.get('/admin/holidays', {
        headers: { 'admin-token': adminToken }
      });

      if (response.data.success) {
        setHolidays(response.data.data);
      }
    } catch (error) {
      console.error('獲取假日列表失敗:', error);
      setMessage({ type: 'error', text: '獲取假日列表失敗' });
    }
  };

  // 獲取統計數據
  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats', {
        headers: { 'admin-token': adminToken }
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('獲取統計數據失敗:', error);
    }
  };

  // 更新預約狀態
  const updateReservationStatus = async (id, status) => {
    try {
      const response = await api.put(`/admin/reservations/${id}/status`, 
        { status },
        { headers: { 'admin-token': adminToken } }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: '預約狀態更新成功' });
        fetchReservations();
      }
    } catch (error) {
      console.error('更新預約狀態失敗:', error);
      setMessage({ type: 'error', text: '更新預約狀態失敗' });
    }
  };

  // 刪除預約
  const deleteReservation = async (id) => {
    if (!window.confirm('確定要刪除這個預約嗎？')) return;

    try {
      const response = await api.delete(`/admin/reservations/${id}`, {
        headers: { 'admin-token': adminToken }
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: '預約刪除成功' });
        fetchReservations();
      }
    } catch (error) {
      console.error('刪除預約失敗:', error);
      setMessage({ type: 'error', text: '刪除預約失敗' });
    }
  };

  // 新增假日
  const addHoliday = async () => {
    try {
      const response = await api.post('/admin/holidays', newHoliday, {
        headers: { 'admin-token': adminToken }
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: '假日設置成功' });
        setNewHoliday({ date: '', description: '', time_slots: [] });
        fetchHolidays();
      }
    } catch (error) {
      console.error('新增假日失敗:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '新增假日失敗' });
    }
  };

  // 刪除假日
  const deleteHoliday = async (eventId) => {
    if (!window.confirm('確定要刪除這個假日設置嗎？')) return;

    try {
      const response = await api.delete(`/admin/holidays/${eventId}`, {
        headers: { 'admin-token': adminToken }
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: '假日刪除成功' });
        fetchHolidays();
      }
    } catch (error) {
      console.error('刪除假日失敗:', error);
      setMessage({ type: 'error', text: '刪除假日失敗' });
    }
  };

  // 初始化
  useEffect(() => {
    fetchReservations();
    fetchHolidays();
    fetchStats();
  }, [activeTab]);

  // 當分頁或篩選改變時重新獲取數據
  useEffect(() => {
    if (activeTab === 'reservations') {
      fetchReservations();
    }
  }, [pagination.page, filters]);

  // 清除消息
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getStatusIcon = (status) => {
    switch (status) {
      case '已確認':
        return <CheckCircle size={16} className="text-green-500" />;
      case '未確認':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case '已取消':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '已確認':
        return 'bg-green-100 text-green-800';
      case '未確認':
        return 'bg-yellow-100 text-yellow-800';
      case '已取消':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <Settings size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
          Amaze 管理員後台
        </h1>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('reservations')}
        >
          <Calendar size={16} />
          預約管理
        </button>
        <button
          className={`tab-btn ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
        >
          <CalendarDays size={16} />
          假日管理
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 size={16} />
          統計數據
        </button>
      </div>

      {/* 預約管理 */}
      {activeTab === 'reservations' && (
        <div className="tab-content">
          <div className="filters-section">
            <div className="filter-group">
              <label>狀態篩選：</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="filter-select"
              >
                <option value="">全部狀態</option>
                <option value="未確認">未確認</option>
                <option value="已確認">已確認</option>
                <option value="已取消">已取消</option>
              </select>
            </div>
            <div className="filter-group">
              <label>日期篩選：</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="filter-input"
              />
            </div>
          </div>

          <div className="reservations-table">
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>電話</th>
                  <th>日期</th>
                  <th>時段</th>
                  <th>備註</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(reservation => (
                  <tr key={reservation.id}>
                    <td>{reservation.name}</td>
                    <td>{reservation.phone}</td>
                    <td>{reservation.date}</td>
                    <td>{reservation.time}</td>
                    <td>{reservation.note || '-'}</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(reservation.check_status)}`}>
                        {getStatusIcon(reservation.check_status)}
                        {reservation.check_status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <select
                          value={reservation.check_status}
                          onChange={(e) => updateReservationStatus(reservation.id, e.target.value)}
                          className="status-select"
                        >
                          <option value="未確認">未確認</option>
                          <option value="已確認">已確認</option>
                          <option value="已取消">已取消</option>
                        </select>
                        <button
                          onClick={() => deleteReservation(reservation.id)}
                          className="btn-delete"
                          title="刪除預約"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分頁 */}
          <div className="pagination">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
              className="pagination-btn"
            >
              上一頁
            </button>
            <span className="pagination-info">
              第 {pagination.page} 頁，共 {pagination.totalPages} 頁
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="pagination-btn"
            >
              下一頁
            </button>
          </div>
        </div>
      )}

      {/* 假日管理 */}
      {activeTab === 'holidays' && (
        <div className="tab-content">
          <div className="holiday-form">
            <h3>新增假日</h3>
            <div className="form-row">
              <div className="form-group">
                <label>日期：</label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>描述：</label>
                <input
                  type="text"
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, description: e.target.value }))}
                  className="form-input"
                  placeholder="例：春節連假"
                />
              </div>
              <div className="form-group">
                <label>限制時段（可選）：</label>
                <input
                  type="text"
                  value={newHoliday.time_slots.join(', ')}
                  onChange={(e) => setNewHoliday(prev => ({ 
                    ...prev, 
                    time_slots: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }))}
                  className="form-input"
                  placeholder="例：10:00, 14:00, 15:00"
                />
              </div>
              <button onClick={addHoliday} className="btn-primary">
                <Plus size={16} />
                新增假日
              </button>
            </div>
          </div>

          <div className="holidays-list">
            <h3>假日列表</h3>
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>描述</th>
                  <th>限制時段</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map(holiday => (
                  <tr key={holiday.id}>
                    <td>{holiday.date}</td>
                    <td>{holiday.description}</td>
                    <td>
                      {holiday.time_slots && holiday.time_slots.length > 0 ? 
                        holiday.time_slots.join(', ') : 
                        '全天暫停'
                      }
                    </td>
                    <td>
                      <button
                        onClick={() => deleteHoliday(holiday.id)}
                        className="btn-delete"
                        title="刪除假日"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 統計數據 */}
      {activeTab === 'stats' && (
        <div className="tab-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Calendar size={24} />
              </div>
              <div className="stat-content">
                <h3>今日預約</h3>
                <div className="stat-numbers">
                  <span className="stat-main">{stats.today?.total || 0}</span>
                  <div className="stat-breakdown">
                    <span className="stat-confirmed">已確認: {stats.today?.confirmed || 0}</span>
                    <span className="stat-pending">待確認: {stats.today?.pending || 0}</span>
                    <span className="stat-cancelled">已取消: {stats.today?.cancelled || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <h3>本週預約</h3>
                <div className="stat-numbers">
                  <span className="stat-main">{stats.week?.total || 0}</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <h3>總預約數</h3>
                <div className="stat-numbers">
                  <span className="stat-main">{stats.total?.total || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 