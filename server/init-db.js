const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 資料庫檔案路徑
const dbPath = path.join(__dirname, 'amaze_booking.db');

// 建立資料庫連接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 資料庫連接失敗:', err.message);
  } else {
    console.log('✅ 成功連接到 SQLite 資料庫');
  }
});

// 建立預約表
const createReservationsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      note TEXT,
      check_status TEXT DEFAULT '未確認',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, time)
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('❌ 建立預約表失敗:', err.message);
    } else {
      console.log('✅ 預約表建立成功');
    }
  });
};

// 建立索引
const createIndexes = () => {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_date ON reservations(date)',
    'CREATE INDEX IF NOT EXISTS idx_check_status ON reservations(check_status)',
    'CREATE INDEX IF NOT EXISTS idx_created_at ON reservations(created_at)'
  ];

  indexes.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        console.error(`❌ 建立索引 ${index + 1} 失敗:`, err.message);
      } else {
        console.log(`✅ 索引 ${index + 1} 建立成功`);
      }
    });
  });
};

// 插入測試資料
const insertTestData = () => {
  const testReservations = [
    {
      id: 'test-001',
      name: '張小明',
      phone: '0912345678',
      date: '2025-01-15',
      time: '14:00',
      note: '測試預約',
      check_status: '已確認'
    },
    {
      id: 'test-002',
      name: '李小花',
      phone: '0987654321',
      date: '2025-01-16',
      time: '10:00',
      note: '客戶特別要求',
      check_status: '未確認'
    }
  ];

  const sql = `
    INSERT OR IGNORE INTO reservations 
    (id, name, phone, date, time, note, check_status) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  testReservations.forEach((reservation, index) => {
    db.run(sql, [
      reservation.id,
      reservation.name,
      reservation.phone,
      reservation.date,
      reservation.time,
      reservation.note,
      reservation.check_status
    ], (err) => {
      if (err) {
        console.error(`❌ 插入測試資料 ${index + 1} 失敗:`, err.message);
      } else {
        console.log(`✅ 測試資料 ${index + 1} 插入成功`);
      }
    });
  });
};

// 執行初始化
const initDatabase = () => {
  console.log('🚀 開始初始化 Amaze 預約系統資料庫...');
  
  createReservationsTable();
  
  // 等待表建立完成後建立索引和插入測試資料
  setTimeout(() => {
    createIndexes();
    setTimeout(() => {
      insertTestData();
      setTimeout(() => {
        console.log('🎉 資料庫初始化完成！');
        console.log('📁 資料庫檔案位置:', dbPath);
        db.close();
      }, 1000);
    }, 1000);
  }, 1000);
};

// 執行初始化
initDatabase(); 