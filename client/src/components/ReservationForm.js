import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { UserPlus, Phone, Calendar, Clock, FileText, CheckCircle } from 'lucide-react';

// 營業時間配置
const businessHours = {
  // 週一到週五：10:00-20:30（新增19:30-20:30）
  monday: { start: '10:00', end: '20:30', closed: false },
  tuesday: { start: '10:00', end: '20:30', closed: false },
  wednesday: { start: '10:00', end: '20:30', closed: false },
  thursday: { start: '10:00', end: '20:30', closed: false },
  friday: { start: '10:00', end: '20:30', closed: false },
  // 週六：12:00-18:00（最晚預約時間17:00）
  saturday: { start: '12:00', end: '18:00', closed: false },
  // 週日：公休
  sunday: { start: '10:00', end: '19:30', closed: true }
};

// 生成時間段函數
const generateTimeSlots = (startTime, endTime, isSaturday = false) => {
  const slots = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMinute = startMinute;
  
  while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
    const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    if (isSaturday) {
      // 週六：每30分鐘開始一個1小時時段，排除17:30-18:30
      const isSaturdayLateSlot = currentHour >= 18;
      const isSaturdayExcludedSlot = (currentHour === 17 && currentMinute >= 30);
      if (!isSaturdayLateSlot && !isSaturdayExcludedSlot) {
        slots.push(timeSlot);
      }
      // 週六每30分鐘增加
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour += 1;
      }
    } else {
      // 其他天：每30分鐘一個時段，排除午休和13:30-14:30，但包含14:00-15:00和19:30-20:30，排除20:00-21:00
      const isLunchBreak = (currentHour === 12 && currentMinute >= 30) || 
                           (currentHour === 13 && currentMinute < 30);
      const isExcludedSlot = (currentHour === 13 && currentMinute >= 30) || 
                             (currentHour === 14 && currentMinute < 30);
      const isIncludedSlot = (currentHour === 14 && currentMinute === 0) ||
                             (currentHour === 19 && currentMinute >= 30);
      const isExcluded20Slot = (currentHour === 20 && currentMinute === 0);
      
      if ((!isLunchBreak && !isExcludedSlot && !isExcluded20Slot) || isIncludedSlot) {
        slots.push(timeSlot);
      }
      
      // 增加30分鐘
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour += 1;
      }
    }
  }
  
  return slots;
};

// 獲取指定日期的營業時間
const getBusinessHoursForDate = (dateString) => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0=週日, 1=週一, ..., 6=週六
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  return businessHours[dayName];
};

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState({});
  const [businessHoursForDate, setBusinessHoursForDate] = useState(null);
  const [isDateClosed, setIsDateClosed] = useState(false);
  const [holidayInfo, setHolidayInfo] = useState(null);

  // 當日期改變時，獲取該日期的可用時段
  useEffect(() => {
    if (selectedDate) {
      // 檢查營業時間
      const hours = getBusinessHoursForDate(selectedDate);
      setBusinessHoursForDate(hours);
      setIsDateClosed(hours.closed);
      
      // 重置假日信息
      setHolidayInfo(null);
      
      if (!hours.closed) {
        fetchAvailableSlots(selectedDate);
      } else {
        setAvailableSlots([]);
        setBookedSlots({});
      }
    }
  }, [selectedDate]);

  const fetchAvailableSlots = useCallback(async (date) => {
    try {
      setError(null);
      
      // 獲取該日期的營業時間
      const hours = getBusinessHoursForDate(date);
      
      // 如果該日期公休，直接返回
      if (hours.closed) {
        setAvailableSlots([]);
        setBookedSlots({});
        setHolidayInfo(null);
        return;
      }
      
      // 根據營業時間生成時段
      const isSaturday = new Date(date).getDay() === 6; // 6 = 週六
      const timeSlotsForDate = generateTimeSlots(hours.start, hours.end, isSaturday);
      
      // 獲取該日期的所有 Google Calendar 事件
      const response = await api.get(`/reservations/date/${date}`);
      const calendarEvents = response.data.data || [];
      const holidayData = response.data.holiday || null;
      
      // 設置假日信息
      setHolidayInfo(holidayData);
      
      // 如果有假日設置，檢查是否為完全休息日
      if (holidayData) {
        const restrictedSlots = holidayData.time_slots || [];
        if (restrictedSlots.length === 0) {
          // 如果沒有指定限制時段，表示整個日期都休息
          setAvailableSlots([]);
          setBookedSlots({});
          return;
        }
        
        // 如果有限制時段，從可用時段中排除這些時段
        // 注意：這裡不需要額外處理，因為後續的過濾邏輯會處理
      }
      
      // 從事件中提取已預約的時段和計數
      const slotCounts = {};
      calendarEvents.forEach(event => {
        const startTime = new Date(event.start);
        const timeSlot = startTime.toTimeString().slice(0, 5); // 提取 HH:MM 格式
        slotCounts[timeSlot] = (slotCounts[timeSlot] || 0) + 1;
      });
      
      // 過濾出可用時段（最多同時段接上限兩組）
      let available = timeSlotsForDate.filter(slot => {
        const count = slotCounts[slot] || 0;
        return count < 2; // 最多兩組
      });
      
      // 如果有假日限制時段，進一步過濾
      if (holidayData && holidayData.time_slots && holidayData.time_slots.length > 0) {
        available = available.filter(slot => !holidayData.time_slots.includes(slot));
      }
      
      setAvailableSlots(available);
      setBookedSlots(slotCounts);
    } catch (error) {
      console.error('獲取可用時段失敗:', error);
      setError('無法獲取可用時段，請稍後再試');
      
      // 如果API失敗，根據營業時間顯示時段
      const hours = getBusinessHoursForDate(date);
      if (!hours.closed) {
        const timeSlotsForDate = generateTimeSlots(hours.start, hours.end);
        setAvailableSlots(timeSlotsForDate);
      } else {
        setAvailableSlots([]);
      }
      setBookedSlots({});
      setHolidayInfo(null);
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
        // 設置成功數據
        setSuccessData({
          name: formData.name,
          date: formData.date,
          time: formData.time
        });
        setShowSuccessModal(true);
        
        // 清空表單
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
                預約時段 *
              </label>
              <div className="time-slots-container">
                {selectedDate ? (
                  isDateClosed ? (
                    <div className="closed-message">
                      <div className="alert alert-warning">
                        <strong>🏖️ 該日期為公休日</strong>
                        <p>週日暫停營業，請選擇其他日期</p>
                      </div>
                    </div>
                  ) : holidayInfo ? (
                    <div className="closed-message">
                      <div className="alert alert-warning">
                        <strong>🏖️ 該日期為假日：{holidayInfo.description}</strong>
                        <p>暫停營業，請選擇其他日期</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {businessHoursForDate && (
                        <div className="business-hours-info">
                          <small>
                            📅 營業時間：10:00 - 20:30
                            <br />
                            🍽️ 13:00-14:00 午休時間

                            {holidayInfo && holidayInfo.time_slots && holidayInfo.time_slots.length > 0 && (
                              <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                <br />🚫 假日限制時段：{holidayInfo.time_slots.join(', ')}
                              </span>
                            )}
                          </small>
                        </div>
                      )}
                      <div className="time-slots-grid">
                        {availableSlots.map(slot => {
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
                    </div>
                  )
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
                placeholder="主題，活動日期，特殊需求"
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

      {/* 預約成功彈窗 */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content success-modal">
            <div className="modal-header">
              <h3>🎉 恭喜預約成功</h3>
            </div>
            <div className="modal-body">
              <div className="success-message">
                <p className="success-subtitle">
                  我們 {successData.date} {successData.time} 見
                </p>
              </div>
              <div className="notice-section">
                <h4>📋 注意事項</h4>
                <ul>
                  <li>⏰ 預約時長一小時</li>
                  <li>📞 修改 / 取消預約請提早來電通知</li>
                  <li>🧼 為提供您與其他顧客最佳體驗，請您來店前留意個人衛生與氣味，感謝配合</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowSuccessModal(false)}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationForm; 