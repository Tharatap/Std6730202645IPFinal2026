const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_unicode_ci',
});

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS Tharatap_employees_final_exam (
  Tharatap_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Tharatap_name VARCHAR(100) NOT NULL,
  Tharatap_position VARCHAR(100) NOT NULL,
  Tharatap_status ENUM('Active','On Leave') NOT NULL DEFAULT 'Active',
  Tharatap_salary DECIMAL(10,2) NOT NULL,
  Tharatap_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

// Keep in sync with sql/seed.sql
const SEED = [
  ['Somchai Jaidee', 'Junior Developer', 'Active', 15000],
  ['Suda Rakdee', 'HR Assistant', 'On Leave', 18000],
  ['Anan Srisuk', 'Support Engineer', 'Active', 22000],
  ['Malee Wongsa', 'Accountant', 'Active', 45000],
  ['Krit Thongdee', 'Senior Developer', 'On Leave', 55000],
  ['Pim Chaiyo', 'Project Manager', 'Active', 60000],
  ['Wichai Boonmee', 'Engineering Manager', 'Active', 110000],
  ['Nida Kaewta', 'CTO', 'On Leave', 120000],
];

async function initDb() {
  await pool.execute(CREATE_TABLE_SQL);
  const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM Tharatap_employees_final_exam');
  if (Number(rows[0].c) > 0) return false;
  for (const row of SEED) {
    await pool.execute(
      'INSERT INTO Tharatap_employees_final_exam (Tharatap_name, Tharatap_position, Tharatap_status, Tharatap_salary) VALUES (?, ?, ?, ?)',
      row
    );
  }
  return true;
}

module.exports = { pool, initDb };
