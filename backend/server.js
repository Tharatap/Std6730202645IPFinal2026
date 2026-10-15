require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');
const { salaryClusters } = require('./kmeans');

const PORT = Number(process.env.PORT);
if (!process.env.PORT || !Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
  console.error('ERROR: PORT is missing or invalid in .env');
  process.exit(1);
}

const TOKEN = 'mock-jwt-token';
const MAX_SALARY = 99999999.99; // DECIMAL(10,2)
const SELECT_COLS = 'Tharatap_id, Tharatap_name, Tharatap_position, Tharatap_status, Tharatap_salary';

const app = express();
app.use(cors());
app.use(express.json());

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const toEmployee = (row) => ({
  id: String(row.Tharatap_id),
  name: row.Tharatap_name,
  position: row.Tharatap_position,
  status: row.Tharatap_status,
  salary: Number(row.Tharatap_salary),
});

// Positive integer id within INT UNSIGNED range, else null
const parseId = (raw) => {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 && id <= 4294967295 ? id : null;
};

const requireAuth = (req, res, next) => {
  if (req.get('Authorization') !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({ success: true, token: TOKEN });
  }
  res.status(401).json({ success: false, message: 'Invalid username or password' });
});

app.use('/api/employees', requireAuth);

app.get('/api/employees', asyncHandler(async (req, res) => {
  const raw = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  let rows;
  if (raw) {
    // Escape LIKE wildcards so user input is matched literally
    const term = raw.slice(0, 100).replace(/[\\%_]/g, '\\$&');
    [rows] = await pool.execute(
      `SELECT ${SELECT_COLS} FROM Tharatap_employees
       WHERE Tharatap_name LIKE CONCAT('%', ?, '%') OR Tharatap_position LIKE CONCAT('%', ?, '%')
       ORDER BY Tharatap_id ASC`,
      [term, term]
    );
  } else {
    [rows] = await pool.execute(`SELECT ${SELECT_COLS} FROM Tharatap_employees ORDER BY Tharatap_id ASC`);
  }
  res.json({ success: true, data: rows.map(toEmployee) });
}));

// Must be before /:id routes
app.get('/api/employees/salary-clusters', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT Tharatap_salary FROM Tharatap_employees');
  res.json({ success: true, clusters: salaryClusters(rows.map((r) => Number(r.Tharatap_salary)), 3) });
}));

app.post('/api/employees', asyncHandler(async (req, res) => {
  const { name, position, salary } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  if (typeof position !== 'string' || !position.trim()) {
    return res.status(400).json({ success: false, message: 'Position is required' });
  }
  if (name.trim().length > 100 || position.trim().length > 100) {
    return res.status(400).json({ success: false, message: 'Name and position must be at most 100 characters' });
  }
  const isNumeric = typeof salary === 'number' || (typeof salary === 'string' && salary.trim() !== '');
  const sal = isNumeric ? Number(salary) : NaN;
  if (!Number.isFinite(sal) || sal <= 0) {
    return res.status(400).json({ success: false, message: 'Salary must be a number greater than 0' });
  }
  if (sal > MAX_SALARY) {
    return res.status(400).json({ success: false, message: 'Salary is too large' });
  }

  const [result] = await pool.execute(
    'INSERT INTO Tharatap_employees (Tharatap_name, Tharatap_position, Tharatap_salary) VALUES (?, ?, ?)',
    [name.trim(), position.trim(), Math.round(sal * 100) / 100]
  );
  const [rows] = await pool.execute(`SELECT ${SELECT_COLS} FROM Tharatap_employees WHERE Tharatap_id = ?`, [result.insertId]);
  res.status(201).json({ success: true, data: toEmployee(rows[0]) });
}));

app.put('/api/employees/:id/status', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ success: false, message: 'Employee not found' });

  const [result] = await pool.execute(
    "UPDATE Tharatap_employees SET Tharatap_status = IF(Tharatap_status = 'Active', 'On Leave', 'Active') WHERE Tharatap_id = ?",
    [id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Employee not found' });

  const [rows] = await pool.execute(`SELECT ${SELECT_COLS} FROM Tharatap_employees WHERE Tharatap_id = ?`, [id]);
  res.json({ success: true, data: toEmployee(rows[0]) });
}));

app.delete('/api/employees/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ success: false, message: 'Employee not found' });

  const [result] = await pool.execute('DELETE FROM Tharatap_employees WHERE Tharatap_id = ?', [id]);
  if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.json({ success: true, message: 'Employee deleted successfully' });
}));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON body' });
  }
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ success: false, message: err.expose ? err.message : 'Bad request' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
  initDb()
    .then((seeded) => console.log(seeded ? 'DB ready (seeded sample data)' : 'DB ready'))
    .catch((err) => console.error('DB init failed:', err.code || err.message));
});
