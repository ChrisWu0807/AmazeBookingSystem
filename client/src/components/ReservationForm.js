import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Phone, Calendar, Clock, FileText, CheckCircle } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState('');

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  // 當日期改變時，獲取該日期的可用時段
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async (date) => {
    try {
      // 獲取該日期的所有 Google Calendar 事件
      const response = await axios.get(`/api/reservations/date/${date}`);
      const calendarEvents = response.data.data || [];
      
      // 從事件中提取已預約的時段
      const bookedSlots = calendarEvents.map(event => {
        const startTime = new Date(event.start);
        return startTime.toTimeString().slice(0, 5); // 提取 HH:MM 格式
      });
      
      // 過濾出可用時段
      const available = timeSlots.filter(slot => 
        !bookedSlots.includes(slot)
      );
      
      setAvailableSlots(available);
    } catch (error) {
      console.error('獲取可用時段失敗:', error);
      setAvailableSlots(timeSlots); // 如果API失敗，顯示所有時段
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post('/api/reservations', {
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
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || '預約失敗，請稍後再試';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

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
                  availableSlots.length > 0 ? (
                    <div className="time-slots-grid">
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          className={`time-slot-btn ${formData.time === slot ? 'selected' : ''}`}
                          onClick={() => handleTimeSlotClick(slot)}
                        >
                          {slot} - {slot.split(':')[0] === '23' ? '00:00' : `${parseInt(slot.split(':')[0]) + 1}:00`}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="no-slots-message">
                      該日期已無可用時段，請選擇其他日期
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
    </div>
  );
};

export default ReservationForm; 