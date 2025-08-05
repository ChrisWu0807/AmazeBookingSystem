import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { UserPlus, Phone, Calendar, Clock, FileText, CheckCircle } from 'lucide-react';

// 時間段設置：從10:00開始，每30分鐘一個時段，最晚19:30
const timeSlots = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', 
  '19:00', '19:30'
];

const ReservationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    note: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 當日期改變時，獲取該日期的可用時段
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailableSlots = useCallback(async (date) => {
    try {
      setError(null);
      // 獲取該日期的所有 Google Calendar 事件
      const response = await api.get(`/reservations/date/${date}`);
      const calendarEvents = response.data.data || [];
      
      // 從事件中提取已預約的時段和計數
      const slotCounts = {};
      calendarEvents.forEach(event => {
        const startTime = new Date(event.start);
        const timeSlot = startTime.toTimeString().slice(0, 5); // 提取 HH:MM 格式
        slotCounts[timeSlot] = (slotCounts[timeSlot] || 0) + 1;
      });
      
      // 過濾出可用時段（最多同時段接上限兩組）
      const available = timeSlots.filter(slot => {
        const count = slotCounts[slot] || 0;
        return count < 2; // 最多兩組
      });
      
      setAvailableSlots(available);
      setBookedSlots(slotCounts);
    } catch (error) {
      console.error('獲取可用時段失敗:', error);
      setError('無法獲取可用時段，請稍後再試');
      setAvailableSlots(timeSlots); // 如果API失敗，顯示所有時段
      setBookedSlots({});
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 如果日期改變，清空已選擇的時段
    if (name === 'date') {
      setSelectedDate(value);
      setFormData(prev => ({
        ...prev,
        time: ''
      }));
    }
  };

  const handleTimeSlotClick = (time) => {
    setFormData(prev => ({
      ...prev,
      time
    }));
  };

  // 獲取時段顯示文字
  const getTimeSlotText = (time) => {
    try {
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
    } catch (error) {
      console.error('時間格式錯誤:', error);
      return `${time} - 錯誤`;
    }
  };

  // 獲取時段狀態樣式
  const getTimeSlotStyle = (time) => {
    try {
      const count = bookedSlots[time] || 0;
      
      if (count >= 2) {
        return 'booked'; // 已滿
      } else if (count === 1) {
        return 'partially-booked'; // 部分預約
      } else {
        return 'available'; // 可用
      }
    } catch (error) {
      console.error('獲取時段樣式錯誤:', error);
      return 'available';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 檢查必填欄位
    if (!formData.name || !formData.phone || !formData.date || !formData.time) {
      setMessage({ type: 'error', text: '請填寫所有必填欄位' });
      return;
    }
    
    // 顯示確認彈窗
    setShowConfirmModal(true);
  };

  const handleConfirmReservation = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setMessage({ type: '', text: '' });
    setError(null);

    try {
      const response = await api.post('/reservations', {
        ...formData,
        check: '未確認' // 客戶預約預設為未確認
      });
      
      if (response.data.success) {
        setMessage({ type: 'success', text: '預約成功！已直接同步到 Google Calendar。' });
        setFormData({
          name: '',
          phone: '',
          date: '',
          time: '',
          note: ''
        });
        setSelectedDate('');
        setAvailableSlots([]);
        setBookedSlots({});
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || '預約失敗，請稍後再試';
      setMessage({ type: 'error', text: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = () => {
    setShowConfirmModal(false);
  };

  // 如果出現錯誤，顯示錯誤信息
  if (error) {
    return (
      <div className="main-content">
        <h1 className="page-title">
          <UserPlus size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
          線上預約系統
        </h1>
        <div className="form-container">
          <div className="card">
            <div className="alert alert-error">
              {error}
              <button 
                onClick={() => setError(null)}
                style={{ marginLeft: '10px', padding: '5px 10px' }}
              >
                重試
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <h1 className="page-title">
        <UserPlus size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
        線上預約系統
      </h1>
      
      <div className="form-container">
        <div className="card">
          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <UserPlus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  姓名 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="請輸入您的姓名"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  電話號碼 *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="請輸入您的電話號碼"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                預約日期 *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="form-input"
                min={new Date().toISOString().split('T')[0]} // 不能選擇過去的日期
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                預約時段 * (每時段最多同時接兩組預約)
              </label>
              <div className="time-slots-container">
                {selectedDate ? (
                  <div className="time-slots-grid">
                    {timeSlots.map(slot => {
                      const slotStyle = getTimeSlotStyle(slot);
                      const isAvailable = availableSlots.includes(slot);
                      const count = bookedSlots[slot] || 0;
                      
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`time-slot-btn ${slotStyle} ${formData.time === slot ? 'selected' : ''}`}
                          onClick={() => isAvailable && handleTimeSlotClick(slot)}
                          disabled={!isAvailable}
                          title={count > 0 ? `已預約 ${count}/2 組` : '可預約'}
                        >
                          <div className="time-slot-text">{getTimeSlotText(slot)}</div>
                          {count > 0 && (
                            <div className="booking-count">({count}/2)</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="select-date-message">
                    請先選擇預約日期
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                備註
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                className="form-input"
                rows="3"
                placeholder="請輸入備註資訊（選填）"
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !formData.time}
                style={{ minWidth: '120px' }}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    處理中...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    確認預約
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 確認預約彈窗 */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📋 確認預約資訊</h3>
            </div>
            <div className="modal-body">
              <p>
                <strong>{formData.name}</strong> 先生/小姐，您預約的時段是：
              </p>
              <div className="reservation-details">
                <p><strong>📅 日期：</strong>{formData.date}</p>
                <p><strong>🕐 時段：</strong>{getTimeSlotText(formData.time)}</p>
                <p><strong>📞 電話：</strong>{formData.phone}</p>
                {formData.note && (
                  <p><strong>📝 備註：</strong>{formData.note}</p>
                )}
              </div>
              <p className="confirm-question">請問是否正確？</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelReservation}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmReservation}
                disabled={loading}
              >
                {loading ? '處理中...' : '確認預約'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationForm; 