const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, 'amaze_booking.db');
    this.db = null;
  }

  // 連接資料庫
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ 資料庫連接失敗:', err.message);
          reject(err);
        } else {
          console.log('✅ 成功連接到 SQLite 資料庫');
          resolve();
        }
      });
    });
  }

  // 關閉資料庫連接
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ 關閉資料庫連接失敗:', err.message);
          } else {
            console.log('✅ 資料庫連接已關閉');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // 執行查詢
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // 執行查詢並返回單一結果
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 執行查詢並返回多個結果
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 新增預約
  async createReservation(reservation) {
    const sql = `
      INSERT INTO reservations 
      (id, name, phone, date, time, note, check_status) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      reservation.id,
      reservation.name,
      reservation.phone,
      reservation.date,
      reservation.time,
      reservation.note || '',
      reservation.check || '未確認'
    ];

    return await this.run(sql, params);
  }

  // 查詢預約
  async getReservation(id) {
    const sql = 'SELECT * FROM reservations WHERE id = ?';
    return await this.get(sql, [id]);
  }

  // 查詢特定週的預約
  async getReservationsByWeek(startDate, endDate) {
    const sql = `
      SELECT * FROM reservations 
      WHERE date BETWEEN ? AND ? 
      ORDER BY date, time
    `;
    return await this.all(sql, [startDate, endDate]);
  }

  // 更新預約確認狀態
  async updateReservationStatus(id, status) {
    const sql = `
      UPDATE reservations 
      SET check_status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    return await this.run(sql, [status, id]);
  }

  // 刪除預約
  async deleteReservation(id) {
    const sql = 'DELETE FROM reservations WHERE id = ?';
    return await this.run(sql, [id]);
  }

  // 檢查時段是否已被預約
  async checkTimeSlotConflict(date, time, excludeId = null) {
    let sql = 'SELECT COUNT(*) as count FROM reservations WHERE date = ? AND time = ?';
    let params = [date, time];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const result = await this.get(sql, params);
    return result.count > 0;
  }

  // 取得所有預約
  async getAllReservations() {
    const sql = 'SELECT * FROM reservations ORDER BY date DESC, time DESC';
    return await this.all(sql);
  }

  // 查詢特定日期的預約
  async getReservationsByDate(date) {
    const sql = `
      SELECT * FROM reservations 
      WHERE date = ? 
      ORDER BY time
    `;
    return await this.all(sql, [date]);
  }
}

module.exports = DatabaseService; 