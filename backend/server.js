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

const STATUSES = ['Active', 'On Leave'];
const AMOUNT_RE = /^\d+(\.\d+)?$/;
const queryStr = (v) => (typeof v === 'string' ? v.trim() : '');

// Optional filters (AND): search, position, status, minSalary, maxSalary
app.get('/api/employees', asyncHandler(async (req, res) => {
  const where = [];
  const params = [];

  const search = queryStr(req.query.search);
  if (search) {
    // Escape LIKE wildcards so user input is matched literally
    const term = search.slice(0, 100).replace(/[\\%_]/g, '\\$&');
    where.push("(Tharatap_name LIKE CONCAT('%', ?, '%') OR Tharatap_position LIKE CONCAT('%', ?, '%'))");
    params.push(term, term);
  }

  const position = queryStr(req.query.position);
  if (position) {
    where.push('Tharatap_position = ?');
    params.push(position.slice(0, 100));
  }

  const status = queryStr(req.query.status);
  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Active or On Leave' });
    }
    where.push('Tharatap_status = ?');
    params.push(status);
  }

  const amounts = {};
  for (const key of ['minSalary', 'maxSalary']) {
    const raw = queryStr(req.query[key]);
    if (!raw) continue;
    if (!AMOUNT_RE.test(raw)) {
      return res.status(400).json({ success: false, message: `${key} must be a number greater than or equal to 0` });
    }
    amounts[key] = Number(raw);
  }
  if (amounts.minSalary !== undefined && amounts.maxSalary !== undefined && amounts.minSalary > amounts.maxSalary) {
    return res.status(400).json({ success: false, message: 'minSalary must be less than or equal to maxSalary' });
  }
  if (amounts.minSalary !== undefined) {
    where.push('Tharatap_salary >= ?');
    params.push(amounts.minSalary);
  }
  if (amounts.maxSalary !== undefined) {
    where.push('Tharatap_salary <= ?');
    params.push(amounts.maxSalary);
  }

  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLS} FROM Tharatap_employees_final_exam
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY Tharatap_id ASC`,
    params
  );
  res.json({ success: true, data: rows.map(toEmployee) });
}));

// Must be before /:id routes
app.get('/api/employees/salary-clusters', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT Tharatap_salary FROM Tharatap_employees_final_exam');
  res.json({ success: true, clusters: salaryClusters(rows.map((r) => Number(r.Tharatap_salary)), 3) });
}));

// Shared by POST and PUT /:id → { error } or { value: {name, position, salary} }
function validateEmployee(body) {
  const { name, position, salary } = body || {};
  if (typeof name !== 'string' || !name.trim()) return { error: 'Name is required' };
  if (typeof position !== 'string' || !position.trim()) return { error: 'Position is required' };
  if (name.trim().length > 100 || position.trim().length > 100) {
    return { error: 'Name and position must be at most 100 characters' };
  }
  const isNumeric = typeof salary === 'number' || (typeof salary === 'string' && salary.trim() !== '');
  const sal = isNumeric ? Number(salary) : NaN;
  if (!Number.isFinite(sal) || sal <= 0) return { error: 'Salary must be a number greater than 0' };
  if (sal > MAX_SALARY) return { error: 'Salary is too large' };
  return { value: { name: name.trim(), position: position.trim(), salary: Math.round(sal * 100) / 100 } };
}

app.post('/api/employees', asyncHandler(async (req, res) => {
  const { error, value } = validateEmployee(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  const [result] = await pool.execute(
    'INSERT INTO Tharatap_employees_final_exam (Tharatap_name, Tharatap_position, Tharatap_salary) VALUES (?, ?, ?)',
    [value.name, value.position, value.salary]
  );
  const [rows] = await pool.execute(`SELECT ${SELECT_COLS} FROM Tharatap_employees_final_exam WHERE Tharatap_id = ?`, [result.insertId]);
  res.status(201).json({ success: true, data: toEmployee(rows[0]) });
}));

app.put('/api/employees/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ success: false, message: 'Employee not found' });
  const { error, value } = validateEmployee(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  await pool.execute(
    'UPDATE Tharatap_employees_final_exam SET Tharatap_name = ?, Tharatap_position = ?, Tharatap_salary = ? WHERE Tharatap_id = ?',
    [value.name, value.position, value.salary, id]
  );
  // affectedRows is 0 when values are unchanged, so check existence via SELECT
  const [rows] = await pool.execute(`SELECT ${SELECT_COLS} FROM Tharatap_employees_final_exam WHERE Tharatap_id = ?`, [id]);
  if (!rows.length) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.json({ success: true, data: toEmployee(rows[0]) });
}));

app.put('/api/employees/:id/status', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ success: false, message: 'Employee not found' });

  const [result] = await pool.execute(
    "UPDATE Tharatap_employees_final_exam SET Tharatap_status = IF(Tharatap_status = 'Active', 'On Leave', 'Active') WHERE Tharatap_id = ?",
    [id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Employee not found' });

  const [rows] = await pool.execute(`SELECT ${SELECT_COLS} FROM Tharatap_employees_final_exam WHERE Tharatap_id = ?`, [id]);
  res.json({ success: true, data: toEmployee(rows[0]) });
}));

app.delete('/api/employees/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ success: false, message: 'Employee not found' });

  const [result] = await pool.execute('DELETE FROM Tharatap_employees_final_exam WHERE Tharatap_id = ?', [id]);
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
